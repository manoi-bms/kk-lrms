// useKioskMode — manages fullscreen API + kiosk-mode class on <html>
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useKioskMode() {
  const [isKiosk, setIsKiosk] = useState(false);

  // Sync state when user presses ESC to exit fullscreen
  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        document.documentElement.classList.remove('kiosk-mode');
        setIsKiosk(false);
      }
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const enterKiosk = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      document.documentElement.classList.add('kiosk-mode');
      setIsKiosk(true);
    } catch {
      // Fallback: enter kiosk mode without fullscreen (browser may block)
      document.documentElement.classList.add('kiosk-mode');
      setIsKiosk(true);
    }
  }, []);

  const exitKiosk = useCallback(async () => {
    document.documentElement.classList.remove('kiosk-mode');
    setIsKiosk(false);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleKiosk = useCallback(() => {
    if (isKiosk) {
      exitKiosk();
    } else {
      enterKiosk();
    }
  }, [isKiosk, enterKiosk, exitKiosk]);

  return { isKiosk, toggleKiosk, enterKiosk, exitKiosk };
}
