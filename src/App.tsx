import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { EventBusPage } from './pages/EventBusPage';
import { RulesPage } from './pages/RulesPage';
import { SNSTopicsPage } from './pages/SNSTopicsPage';
import { SQSQueuesPage } from './pages/SQSQueuesPage';
import { ConsumersPage } from './pages/ConsumersPage';
import { LiveCanvasPage } from './pages/LiveCanvasPage';
import { MetricsPage } from './pages/MetricsPage';
import { ChaosLabPage } from './pages/ChaosLabPage';
import { TraceDebuggerPage } from './pages/TraceDebuggerPage';
import { LearnPage } from './pages/LearnPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="event-bus" element={<EventBusPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="sns" element={<SNSTopicsPage />} />
          <Route path="sqs" element={<SQSQueuesPage />} />
          <Route path="consumers" element={<ConsumersPage />} />
          <Route path="canvas" element={<LiveCanvasPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="chaos" element={<ChaosLabPage />} />
          <Route path="traces" element={<TraceDebuggerPage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

