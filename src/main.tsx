import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "katex/dist/katex.min.css"; // CSS pour le rendu LaTeX
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./providers/DataProvider";
import NotificationToast from "./components/NotificationToast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
        <NotificationToast />
      </DataProvider>
    </AuthProvider>
  </StrictMode>
);
