import asyncio
import base64
import unittest

from handlers.audio_handler import AudioProcessor


class AudioTurnTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_chunk_from_stale_turn(self):
        processor = AudioProcessor()
        processor.start_audio_stream("client-a", "turn-new")
        result = await processor.process_audio_chunk(
            "client-a",
            {
                "audio_turn_id": "turn-old",
                "chunk": base64.b64encode(b"audio").decode(),
            },
        )
        self.assertEqual(result["status"], "error")
        self.assertEqual(processor.audio_buffers["client-a"], [])

    async def test_accepts_chunk_for_active_turn(self):
        processor = AudioProcessor()
        processor.start_audio_stream("client-a", "turn-a")
        result = await processor.process_audio_chunk(
            "client-a",
            {
                "audio_turn_id": "turn-a",
                "chunk": base64.b64encode(b"audio").decode(),
                "is_final": True,
            },
        )
        self.assertEqual(result["status"], "success")
        self.assertEqual(processor.audio_buffers["client-a"], [b"audio"])


if __name__ == "__main__":
    unittest.main()
