import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdvancedPage } from './pages/AdvancedPage';
import { BasicChatPage } from './pages/BasicChatPage';
import { LiveConsolePage } from './pages/LiveConsolePage';
import { LiveStagePage } from './pages/LiveStagePage';
import { ModeSelectPage } from './pages/ModeSelectPage';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ModeSelectPage />} />
      <Route path="/chat" element={<BasicChatPage />} />
      <Route path="/advanced" element={<AdvancedPage />} />
      <Route path="/live/console" element={<LiveConsolePage />} />
      <Route path="/live/stage" element={<LiveStagePage />} />
      <Route path="/settings" element={<SettingsPage pageType="settings" />} />
      <Route path="/memories" element={<SettingsPage pageType="memory" />} />

      {/* 兼容旧地址 */}
      <Route path="/mobile" element={<Navigate to="/advanced" replace />} />
      <Route
        path="/livestream"
        element={<Navigate to="/live/stage" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
