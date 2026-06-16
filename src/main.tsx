/**
 * Delta Workout
 * Copyright (C) 2026 Giulio
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import { queryClient } from "@/lib/queryClient";

import App from "./App.tsx";
import { UserGate } from "./components/UserGate";
import { initCapacitor } from "./services/capacitorInit";


import "./index.css";
import "./i18n/config";

// Init Capacitor plugins (no-op on web)
void initCapacitor();

// When a new service worker takes control (after an app update), reload so the
// fresh index.html + new chunk hashes are used instead of the stale cached ones.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// Handle virtual keyboard overlap for mobile/PWA
if (window.visualViewport) {
  const updateKeyboardOffset = () => {
    const vv = window.visualViewport!;
    const offset = window.innerHeight - vv.height - vv.offsetTop;
    document.documentElement.style.setProperty('--keyboard-offset', `${Math.max(0, offset)}px`);

    if (offset > 0 && document.activeElement instanceof HTMLElement) {
      document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  window.visualViewport.addEventListener('resize', updateKeyboardOffset);
  window.visualViewport.addEventListener('scroll', updateKeyboardOffset);
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <UserGate>
      <App />
    </UserGate>
  </QueryClientProvider>
);
