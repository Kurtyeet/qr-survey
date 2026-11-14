'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already running in standalone app mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect iOS Safari
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIos && !(window.navigator as any).standalone) {
      setIsInstallable(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show iOS instruction modal
      setShowIosGuide(true);
    }
  };

  if (isStandalone || !isInstallable) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition shadow-sm"
        title="Install Offline App on Phone"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {/* iOS Safari Home Screen Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 text-center relative border border-slate-200 shadow-2xl">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Install on iPhone / iPad</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Install this app directly onto your home screen for full offline capability:
            </p>
            <div className="bg-slate-50 rounded-xl p-3 text-left text-xs space-y-2 mb-4 border border-slate-200">
              <div className="flex items-start gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                <span>Tap the <strong>Share</strong> button at the bottom of Safari.</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
