import re
from typing import Optional
import httpx
from .models import DouyinLiveInfo

DESKTOP_UA = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
)

REGMAP = {
    'room_id': r'{"state":{[\s\S]*?"roomStore":{[\s\S]*?"roomInfo":{[\s\S]*?"roomId":"([0-9]+?)"',
    'unique_id': r'{"state":{[\s\S]*?"userStore":{[\s\S]*?"odin":{[\s\S]*?"user_unique_id":"([0-9]+?)"',
    'avatar': r'{"state":{[\s\S]*?"roomStore":{[\s\S]*?"roomInfo":{[\s\S]*?"anchor":{[\s\S]*?"avatar_thumb":{[\s\S]*?"url_list":\["([\S]+?)"',
    'cover': r'{"state":{[\s\S]*?"roomStore":{[\s\S]*?"roomInfo":{[\s\S]*?"room":{[\s\S]*?"cover":{[\s\S]*?"url_list":\["([\S]+?)"',
    'nickname': r'{"state":{[\s\S]*?"roomStore":{[\s\S]*?"roomInfo":{[\s\S]*?"anchor":{[\s\S]*?"nickname":"([\s\S]+?)"',
    'title': r'{"state":{[\s\S]*?"roomStore":{[\s\S]*?"roomInfo":{[\s\S]*?"room":{[\s\S]*?"title":"([\s\S]+?)"',
    'status': r'{"state":{[\s\S]*?"roomStore":{[\s\S]*?"roomInfo":{[\s\S]*?"room":{[\s\S]*?"status":([0-9]{1})',
}


def _extract(name: str, text: str) -> str:
    match = re.search(REGMAP[name], text)
    return match.group(1) if match else ''


def parse_live_html(html: str, room_num: str = '') -> Optional[DouyinLiveInfo]:
    match = re.search(
        r'<script\snonce="\S+?"\s>self\.__pace_f\.push\(\[1,"[a-z]?:\[\\"\$\\",\\"\$L\d+\\",null,([\s\S]+?state[\s\S]+?)\]\\n"\]\)</script>',
        html,
    )
    if not match:
        return None
    blob = re.sub(r'\\{1,7}"', '"', match.group(1))
    info = DouyinLiveInfo(
        room_id=_extract('room_id', blob),
        unique_id=_extract('unique_id', blob),
        avatar=_extract('avatar', blob).replace('\\u0026', '&'),
        cover=_extract('cover', blob).replace('\\u0026', '&'),
        nickname=_extract('nickname', blob),
        title=_extract('title', blob),
        status=int(_extract('status', blob) or '4'),
        room_num=room_num,
    )
    if not info.room_id or not info.unique_id:
        return None
    return info


async def get_live_info(room_num: str, client: httpx.AsyncClient) -> DouyinLiveInfo:
    url = f'https://live.douyin.com/{room_num}'
    headers = {'User-Agent': DESKTOP_UA, 'Referer': 'https://live.douyin.com/'}
    for _ in range(2):
        response = await client.get(url, headers=headers, follow_redirects=True, timeout=20)
        response.raise_for_status()
        info = parse_live_html(response.text, room_num)
        if info:
            return info
    raise RuntimeError('无法解析抖音直播间信息')
