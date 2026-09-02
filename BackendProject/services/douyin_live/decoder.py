import base64
import json
import subprocess
from pathlib import Path
from typing import Any, Dict

RUNTIME = Path(__file__).parent / 'js_runtime' / 'decode.js'


def run_decoder(mode: str, data: bytes = b'') -> Dict[str, Any]:
    payload = {'mode': mode}
    if data:
        payload['data'] = base64.b64encode(data).decode('ascii')
    proc = subprocess.run(
        ['node', str(RUNTIME)],
        input=json.dumps(payload),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=15,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stdout or proc.stderr or 'Node 解码失败')
    parsed = json.loads(proc.stdout)
    if not parsed.get('ok'):
        raise RuntimeError(parsed.get('error') or 'Node 解码失败')
    return parsed.get('result') or {}


def decode_im_response(data: bytes) -> Dict[str, Any]:
    return run_decoder('im', data)


def decode_frame(data: bytes) -> Dict[str, Any]:
    return run_decoder('frame', data)


def encode_ping() -> bytes:
    result = run_decoder('ping')
    return base64.b64decode(result['data'])
