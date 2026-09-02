import asyncio
import time
from typing import Any, Dict, Optional, Awaitable, Callable

from .client import DouyinLiveClient


class DouyinLiveManager:
    def __init__(self):
        self.client: Optional[DouyinLiveClient] = None
        self.task: Optional[asyncio.Task] = None
        self.status: Dict[str, Any] = {
            'state': 'idle',
            'room_num': '',
            'room_info': None,
            'message_count': 0,
            'last_error': None,
            'started_at': None,
        }
        self.on_messages: Optional[Callable[[list[dict]], Awaitable[None]]] = None
        self.on_status: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None

    def configure(self, on_messages, on_status=None):
        self.on_messages = on_messages
        self.on_status = on_status

    async def _status_callback(self, patch: Dict[str, Any]):
        if 'error' in patch:
            self.status['last_error'] = patch['error']
        if 'message_count' in patch:
            self.status['message_count'] = patch['message_count']
        self.status.update(patch)
        if self.on_status:
            await self.on_status(self.status.copy())

    async def start(self, room_num: str) -> Dict[str, Any]:
        if self.task and not self.task.done():
            raise RuntimeError('抖音直播采集已在运行')
        if not self.on_messages:
            raise RuntimeError('DouyinLiveManager 未配置 on_messages')
        self.status.update({
            'state': 'starting',
            'room_num': room_num,
            'room_info': None,
            'message_count': 0,
            'last_error': None,
            'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        })
        self.client = DouyinLiveClient(room_num, self.on_messages, self._status_callback)
        self.task = asyncio.create_task(self._run())
        return self.get_status()

    async def _run(self):
        try:
            assert self.client is not None
            await self.client.connect()
        except asyncio.CancelledError:
            raise
        except Exception as error:
            await self._status_callback({'state': 'error', 'error': str(error)})
        finally:
            self.status['state'] = 'idle' if self.status.get('state') != 'error' else 'error'

    async def stop(self) -> Dict[str, Any]:
        if self.client:
            await self.client.close()
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        self.client = None
        self.task = None
        self.status['state'] = 'idle'
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        running = bool(self.task and not self.task.done())
        return {**self.status, 'running': running}


douyin_live_manager = DouyinLiveManager()
