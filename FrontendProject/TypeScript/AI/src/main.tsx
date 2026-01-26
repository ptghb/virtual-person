/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LAppDelegate } from './lappdelegate';
import { WebSocketManager } from './websocketmanager';

/**
 * 浏览器加载后的处理
 */
window.addEventListener(
  'load',
  (): void => {
    // Initialize WebGL and create the application instance
    if (!LAppDelegate.getInstance().initialize()) {
      return;
    }

    LAppDelegate.getInstance().run();

    // 渲染 React 应用
    const root = createRoot(document.getElementById('root')!);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  },
  { passive: true }
);

/**
 * 结束时的处理
 */
window.addEventListener(
  'beforeunload',
  (): void => {
    LAppDelegate.releaseInstance();
    WebSocketManager.releaseInstance();
  },
  { passive: true }
);
