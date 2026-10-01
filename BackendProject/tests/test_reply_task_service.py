import asyncio
import unittest

from domain.reply_task_service import ReplyTaskService


class ReplyTaskServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancel_stops_active_reply(self):
        service = ReplyTaskService()
        cancelled = asyncio.Event()

        async def reply():
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                cancelled.set()
                raise

        service.start("client-a", reply())
        await asyncio.sleep(0)
        self.assertTrue(await service.cancel_and_wait("client-a"))
        self.assertTrue(cancelled.is_set())
        self.assertIsNone(service.get("client-a"))

    async def test_new_reply_replaces_previous_task(self):
        service = ReplyTaskService()
        first_cancelled = asyncio.Event()
        second_finished = asyncio.Event()

        async def first():
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                first_cancelled.set()
                raise

        async def second():
            second_finished.set()

        service.start("client-a", first())
        await asyncio.sleep(0)
        replacement = service.start("client-a", second())
        await replacement
        await asyncio.sleep(0)

        self.assertTrue(first_cancelled.is_set())
        self.assertTrue(second_finished.is_set())
        self.assertIsNone(service.get("client-a"))

    async def test_cancel_without_active_reply_is_noop(self):
        service = ReplyTaskService()
        self.assertFalse(await service.cancel_and_wait("missing"))


if __name__ == "__main__":
    unittest.main()
