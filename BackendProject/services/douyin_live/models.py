from dataclasses import dataclass, asdict
from typing import Optional, Any, Dict


@dataclass
class DouyinLiveInfo:
    room_id: str
    unique_id: str
    avatar: str = ''
    cover: str = ''
    nickname: str = ''
    title: str = ''
    status: int = 4
    room_num: str = ''

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['roomId'] = data.pop('room_id')
        data['uniqueId'] = data.pop('unique_id')
        data['roomNum'] = data.pop('room_num')
        return data
