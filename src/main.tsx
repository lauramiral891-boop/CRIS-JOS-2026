import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Root from "./Root";
import AdmApp from "./AdmApp";
import { initNotifications } from "./lib/push";

void initNotifications();

if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}

/* Telemóvel: mantém a app em pé. Tablet: roda livremente (vertical e horizontal). */
try {
  const isPhone = Math.min(screen.width, screen.height) < 600;
  const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> };
  if (isPhone && o?.lock) o.lock("portrait").catch(() => undefined);
} catch { /* sem suporte: ignora */ }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {import.meta.env.VITE_APP_MODE === "adm" ? <AdmApp /> : <Root />}
  </StrictMode>
);
