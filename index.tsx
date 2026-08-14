import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import { TooltipHost } from './components/ui/Tooltip';
import { NoticeHost } from './components/ui/Notice';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
      {/* Both mount once, near the root, per DESIGN.md §0.4 and rule 10. */}
      <NoticeHost />
      <TooltipHost />
    </ToastProvider>
  </React.StrictMode>
);
