# -*- coding: utf-8 -*-
import asyncio
from collections.abc import Coroutine
from typing import Any, Dict, Optional


class ReplyTaskService:
    """Tracks one cancellable assistant reply task per WebSocket client."""

    def __init__(self):
        self._tasks: Dict[str, asyncio.Task] = {}

    def start(self, client_id: str, coroutine: Coroutine[Any, Any, None]) -> asyncio.Task:
        previous = self._tasks.get(client_id)
        if previous and not previous.done():
            previous.cancel()

        task = asyncio.create_task(coroutine)
        self._tasks[client_id] = task
        task.add_done_callback(
            lambda completed, cid=client_id: self._remove_if_current(cid, completed)
        )
        return task

    def cancel(self, client_id: str) -> bool:
        task = self._tasks.get(client_id)
        if not task or task.done():
            return False
        task.cancel()
        return True

    async def cancel_and_wait(self, client_id: str) -> bool:
        task = self._tasks.get(client_id)
        if not task or task.done():
            return False
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        return True

    def get(self, client_id: str) -> Optional[asyncio.Task]:
        task = self._tasks.get(client_id)
        return task if task and not task.done() else None

    def _remove_if_current(self, client_id: str, task: asyncio.Task) -> None:
        if self._tasks.get(client_id) is task:
            self._tasks.pop(client_id, None)


reply_task_service = ReplyTaskService()
