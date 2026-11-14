'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] ServiceWorker registered with scope:', registration.scope);

        // Pre-warm the offline survey shell and cache JS chunks while online
        if (navigator.onLine) {
          fetch('/s/offline', { cache: 'reload' }).catch(console.warn);
        }
      } catch (error) {
        console.warn('[SW] ServiceWorker registration failed:', error);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  return null;
}
