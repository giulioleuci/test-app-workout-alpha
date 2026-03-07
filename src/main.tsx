import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { UserGate } from "./components/UserGate";
import { applyPalette, type PaletteId } from "./hooks/useColorPalette";
import { initCapacitor } from "./services/capacitorInit";

// Apply stored theme immediately to avoid flash
const stored = localStorage.getItem('app-theme');
const isDark = stored ? stored === 'dark' : true;
document.documentElement.classList.toggle('dark', isDark);

// Apply stored palette immediately
const paletteId = (localStorage.getItem('app-color-palette') || 'default') as PaletteId;
applyPalette(paletteId, isDark);

// Init Capacitor plugins (no-op on web)
void initCapacitor();

// Handle virtual keyboard overlap for mobile/PWA
if (window.visualViewport) {
  const updateKeyboardOffset = () => {
    const viewport = window.visualViewport!;
    const offset = window.innerHeight - viewport.height;
    document.documentElement.style.setProperty('--keyboard-offset', `${Math.max(0, offset)}px`);
    
    // Ensure the focused element is visible
    if (offset > 0 && document.activeElement instanceof HTMLElement) {
      document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  window.visualViewport.addEventListener('resize', updateKeyboardOffset);
  window.visualViewport.addEventListener('scroll', updateKeyboardOffset);
}

createRoot(document.getElementById("root")!).render(
  <UserGate>
    <App />
  </UserGate>
);
