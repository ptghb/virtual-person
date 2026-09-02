"""Browser-backed Douyin X-Bogus signer.

The signer intentionally runs the original dycast mssdk in Chromium instead of
trying to emulate its browser fingerprint in Python/Node.
"""
from __future__ import annotations

import asyncio
from pathlib import Path


class BrowserSignatureProvider:
    def __init__(self) -> None:
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None
        self._lock = asyncio.Lock()
        self._start_lock = asyncio.Lock()

    async def start(self) -> None:
        if self._page and not self._page.is_closed():
            return
        async with self._start_lock:
            if self._page and not self._page.is_closed():
                return
            try:
                from playwright.async_api import async_playwright
            except ImportError as exc:
                raise RuntimeError(
                    "Playwright 未安装，请执行 pip install -r requirements.txt，"
                    "并执行 playwright install chromium"
                ) from exc

            self._playwright = await async_playwright().start()
            from .room import DESKTOP_UA

            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"],
            )
            self._context = await self._browser.new_context(
                user_agent=DESKTOP_UA,
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
                timezone_id="Asia/Shanghai",
            )
            self._page = await self._context.new_page()
            # Give mssdk a real Douyin origin and browser globals.
            try:
                await self._page.goto(
                    "https://live.douyin.com/",
                    wait_until="domcontentloaded",
                    timeout=30000,
                )
            except Exception:
                # The page itself is not needed; the local mssdk is still loaded below.
                pass

            assets = Path(__file__).with_name("browser_assets")
            await self._page.add_script_tag(path=str(assets / "mssdk.js"))
            signature_source = (assets / "signature.js").read_text(encoding="utf-8")
            # signature.js is an ES module in dycast. It only needs its exports
            # removed when injected as a classic script in this isolated page.
            signature_source = signature_source.replace("export const ", "const ")
            signature_source += "\nwindow.__generateDouyinSignature = getSignature;"
            await self._page.add_script_tag(content=signature_source)
            await self._page.wait_for_function(
                "() => window.byted_acrawler && typeof window.byted_acrawler.frontierSign === 'function'",
                timeout=15000,
            )

    async def get_signature(self, room_id: str, unique_id: str) -> str:
        await self.start()
        assert self._page is not None
        async with self._lock:
            result = await self._page.evaluate(
                """({ roomId, uniqueId }) => window.__generateDouyinSignature(roomId, uniqueId)""",
                {"roomId": str(room_id), "uniqueId": str(unique_id)},
            )
            return str(result or "")

    async def close(self) -> None:
        async with self._start_lock:
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
            self._page = self._context = self._browser = self._playwright = None


browser_signature_provider = BrowserSignatureProvider()
