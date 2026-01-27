/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import * as React from 'react';
import AudioControls from './components/AudioControls';
import WebSocketPanel from './components/WebSocketPanel';
import MotionControls from './components/MotionControls';
import ZoomControls from './components/ZoomControls';

const App: React.FC = () => {
  return (
    <>
      <div id="controls-container">
        <AudioControls />
        <MotionControls />
        <ZoomControls />
      </div>
      <WebSocketPanel />
    </>
  );
};

export default App;
