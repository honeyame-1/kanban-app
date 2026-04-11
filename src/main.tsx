import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service Worker 등록 (CSP script-src 'self' 준수를 위해 인라인 스크립트 대신 여기서 등록)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/kanban-app/sw.js").catch(() => {});
}
