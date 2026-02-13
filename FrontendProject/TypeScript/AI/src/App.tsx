/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AudioControls from './components/AudioControls';
import WebSocketPanel from './components/WebSocketPanel';
import MotionControls from './components/MotionControls';
import ZoomControls from './components/ZoomControls';
import HandGestureControls from './components/HandGestureControls';
import MobilePage from './pages/MobilePage';
import LiveStreamPage from './pages/LiveStreamPage';
import { Button } from 'antd';

const HomePage: React.FC = () => {
  return (
    <>
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px' }}>
        <Link to="/mobile">
          <Button type="primary">进入手机页面</Button>
        </Link>
        <Link to="/livestream">
          <Button type="default">进入直播页面</Button>
        </Link>
      </div>
      <div id="controls-container">
        <AudioControls />
        <MotionControls />
        <ZoomControls />
        <HandGestureControls />
      </div>
      <WebSocketPanel />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mobile" element={<MobilePage />} />
        <Route path="/livestream" element={<LiveStreamPage />} />
      </Routes>
    </Router>
  );
};

export default App;
