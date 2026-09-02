import asyncio
import random
import string
import time
from typing import Awaitable, Callable, Dict, Any, Optional
from urllib.parse import urlencode
import base64

import httpx
import websockets

from .decoder import decode_im_response, decode_frame, encode_ping
from .models import DouyinLiveInfo
from .room import get_live_info, DESKTOP_UA
from .signature_browser import browser_signature_provider

VERSION = '1.0.14-beta.0'
WS_BASE_URL = 'wss://webcast5-ws-web-lf.douyin.com/webcast/im/push/v2/'

MessageCallback = Callable[[list[dict]], Awaitable[None]]
StatusCallback = Callable[[Dict[str, Any]], Awaitable[None]]


def ms_token(length: int = 184) -> str:
    chars = string.ascii_letters + string.digits + '-_'
    return ''.join(random.choice(chars) for _ in range(length))


def make_initial_cursor(room_id: str, unique_id: str, req_ms: int) -> Dict[str, str]:
    now = int(time.time() * 1000)
    return {
        'cursor': f'r-7497180536918546638_d-1_u-1_fh-7497179772733760010_t-{now}',
        'internalExt': (
            f'internal_src:dim|wss_push_room_id:{room_id}|wss_push_did:{unique_id}|'
            f'first_req_ms:{req_ms}|fetch_time:{now}|seq:1|wss_info:0-{now}-0-0|'
            'wrds_v:7497180515443673855'
        ),
    }


class DouyinLiveClient:
    def __init__(self, room_num: str, on_messages: MessageCallback, on_status: Optional[StatusCallback] = None):
        self.room_num = room_num
        self.on_messages = on_messages
        self.on_status = on_status
        self.http = httpx.AsyncClient(timeout=20)
        self.info: Optional[DouyinLiveInfo] = None
        self.cursor = ''
        self.internal_ext = ''
        self.websocket = None
        self.closed = False
        self.message_count = 0
        self.signature = ''

    async def emit_status(self, **status: Any):
        if self.on_status:
            await self.on_status(status)

    async def connect(self):
        self.closed = False
        await self.emit_status(state='connecting', room_num=self.room_num)
        self.info = await get_live_info(self.room_num, self.http)
        if self.info.status != 2:
            await self.emit_status(state='closed', room_info=self.info.to_dict(), error='主播尚未开播或已下播')
            return
        im = await self.fetch_im_info(self.info)
        self.cursor = im.get('cursor') or ''
        self.internal_ext = im.get('internalExt') or ''
        try:
            self.signature = await browser_signature_provider.get_signature(
                self.info.room_id,
                self.info.unique_id,
            )
            if not self.signature:
                await self.emit_status(state='warning', error='frontierSign 返回空 X-Bogus')
        except Exception as error:
            self.signature = ''
            await self.emit_status(state='warning', error=f'抖音签名生成失败，将尝试空签名: {error}')
        await self.run_socket_loop()

    async def close(self):
        self.closed = True
        if self.websocket:
            await self.websocket.close()
        await self.http.aclose()

    async def fetch_im_info(
        self,
        info: DouyinLiveInfo,
        cursor: str = '',
        internal_ext: str = '',
    ) -> Dict[str, Any]:
        req_ms = int(time.time() * 1000)
        params = {
            'aid': 6383,
            'app_name': 'douyin_web',
            'browser_language': 'zh-CN',
            'browser_name': 'Mozilla',
            'browser_online': 'true',
            'browser_platform': 'Win32',
            'browser_version': DESKTOP_UA,
            'cookie_enabled': 'true',
            'cursor': cursor,
            'device_id': '',
            'device_platform': 'web',
            'did_rule': 3,
            'endpoint': 'live_pc',
            'fetch_rule': 1,
            'identity': 'audience',
            'insert_task_id': '',
            'internal_ext': internal_ext,
            'last_rtt': 0,
            'live_id': 1,
            'live_reason': '',
            'need_persist_msg_count': 15,
            'resp_content_type': 'protobuf',
            'screen_height': 1080,
            'screen_width': 1920,
            'support_wrds': 1,
            'tz_name': 'Asia/Shanghai',
            'version_code': 180800,
            'msToken': ms_token(),
            'room_id': info.room_id,
            'user_unique_id': info.unique_id,
            'live_pc': info.room_id,
            'a_bogus': '00000000',
        }
        url = f'https://live.douyin.com/webcast/im/fetch/?{urlencode(params)}'
        headers = {'User-Agent': DESKTOP_UA, 'Referer': f'https://live.douyin.com/{self.room_num}'}
        try:
            response = await self.http.get(url, headers=headers)
            response.raise_for_status()
            return decode_im_response(response.content)
        except Exception as error:
            await self.emit_status(state='warning', error=f'im/fetch 失败，使用降级 cursor: {error}')
            return make_initial_cursor(info.room_id, info.unique_id, req_ms)

    def socket_url(self) -> str:
        assert self.info is not None
        params = {
            'aid': '6383',
            'app_name': 'douyin_web',
            'browser_language': 'zh-CN',
            'browser_name': 'Mozilla',
            'browser_online': 'true',
            'browser_platform': 'Win32',
            'browser_version': DESKTOP_UA,
            'compress': 'gzip',
            'cookie_enabled': 'true',
            'cursor': self.cursor,
            'device_platform': 'web',
            'did_rule': 3,
            'endpoint': 'live_pc',
            'heartbeatDuration': '0',
            'host': 'https://live.douyin.com',
            'identity': 'audience',
            'im_path': '/webcast/im/fetch/',
            'insert_task_id': '',
            'internal_ext': self.internal_ext,
            'live_id': 1,
            'live_reason': '',
            'need_persist_msg_count': '15',
            'room_id': self.info.room_id,
            'screen_height': 1080,
            'screen_width': 1920,
            'signature': self.signature,
            'support_wrds': 1,
            'tz_name': 'Asia/Shanghai',
            'update_version_code': VERSION,
            'user_unique_id': self.info.unique_id,
            'version_code': '180800',
            'webcast_sdk_version': VERSION,
        }
        return f'{WS_BASE_URL}?{urlencode(params)}'

    async def heartbeat_loop(self):
        while not self.closed and self.websocket:
            try:
                await self.websocket.send(encode_ping())
            except Exception:
                return
            await asyncio.sleep(10)

    def cookie_header(self) -> str:
        cookies = []
        for cookie in self.http.cookies.jar:
            if cookie.value:
                cookies.append(f'{cookie.name}={cookie.value}')
        return '; '.join(cookies)

    async def poll_fetch_loop(self):
        assert self.info is not None
        await self.emit_status(
            state='connected',
            transport='http-polling',
            room_info=self.info.to_dict(),
            message_count=self.message_count,
        )
        while not self.closed:
            try:
                im = await self.fetch_im_info(self.info, self.cursor, self.internal_ext)
                if im.get('cursor'):
                    self.cursor = im['cursor']
                if im.get('internalExt'):
                    self.internal_ext = im['internalExt']
                messages = im.get('messages') or []
                if messages:
                    self.message_count += len(messages)
                    await self.on_messages(messages)
                interval_ms = int(im.get('fetchInterval') or 2000)
                await asyncio.sleep(max(1, min(interval_ms / 1000, 5)))
            except Exception as error:
                await self.emit_status(
                    state='warning',
                    transport='http-polling',
                    error=f'im/fetch 轮询失败: {error}',
                    message_count=self.message_count,
                )
                await asyncio.sleep(3)
        await self.emit_status(state='closed', message_count=self.message_count)

    async def run_socket_loop(self):
        headers = {
            'User-Agent': DESKTOP_UA,
            'Origin': 'https://live.douyin.com',
            'Referer': f'https://live.douyin.com/{self.room_num}',
        }
        cookie = self.cookie_header()
        if cookie:
            headers['Cookie'] = cookie
        try:
            async with websockets.connect(self.socket_url(), additional_headers=headers, ping_interval=None) as ws:
                self.websocket = ws
                await self.emit_status(
                    state='connected',
                    transport='websocket',
                    room_info=self.info.to_dict() if self.info else None,
                    message_count=self.message_count,
                )
                heartbeat_task = asyncio.create_task(self.heartbeat_loop())
                try:
                    async for data in ws:
                        if self.closed:
                            break
                        if isinstance(data, str):
                            continue
                        decoded = decode_frame(data)
                        if decoded.get('cursor'):
                            self.cursor = decoded['cursor']
                        if decoded.get('internalExt'):
                            self.internal_ext = decoded['internalExt']
                        if decoded.get('ack'):
                            await ws.send(base64.b64decode(decoded['ack']))
                        messages = decoded.get('messages') or []
                        if messages:
                            self.message_count += len(messages)
                            await self.on_messages(messages)
                finally:
                    heartbeat_task.cancel()
                    await self.emit_status(state='closed', message_count=self.message_count)
        except Exception as error:
            if self.closed:
                return
            await self.emit_status(
                state='warning',
                transport='http-polling',
                room_info=self.info.to_dict() if self.info else None,
                error=f'WebSocket 连接失败，已切换 HTTP 轮询: {error}',
                message_count=self.message_count,
            )
            await self.poll_fetch_loop()
