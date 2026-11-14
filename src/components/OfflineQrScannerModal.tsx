'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, AlertCircle, Upload, QrCode } from 'lucide-react';

interface OfflineQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfflineQrScannerModal({ isOpen, onClose }: OfflineQrScannerModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      setScanning(false);
      return;
    }

    let activeStream: MediaStream | null = null;
    let scanInterval: NodeJS.Timeout | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          return;
        }

        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        activeStream = media;
        setStream(media);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.play().catch(console.warn);
        }

        // Native BarcodeDetector (Chrome Android, Edge, Opera)
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          setScanning(true);

          scanInterval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawUrl = barcodes[0].rawValue;
                  clearInterval(scanInterval!);
                  media.getTracks().forEach((t) => t.stop());
                  handleCodeDetected(rawUrl);
                }
              } catch (e) {
                // Ignore detection frame error
              }
            }
          }, 250);
        } else {
          // Native detector not supported, fallback to manual photo capture
          setScanning(false);
        }
      } catch (err: any) {
        console.warn('Camera error:', err);
        setErrorMsg('Camera access was not granted or is unavailable.');
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [isOpen]);

  const handleCodeDetected = async (rawUrl: string) => {
    onClose();

    // 1. Check if it's a respondent completed survey transfer QR code
    if (rawUrl.startsWith('QRSUB:')) {
      const { unpackSubmission } = await import('@/lib/surveyPacker');
      const { db } = await import('@/lib/db');
      const { syncPendingSubmissions } = await import('@/lib/syncEngine');

      const unpacked = unpackSubmission(rawUrl);
      if (unpacked) {
        await db.submissionsQueue.put(unpacked);
        alert(
          `✅ Collected survey response from ${unpacked.respondentName || 'Respondent'} (${unpacked.respondentRole || 'General'})!\n\nStored locally on your device. It will automatically upload to the server whenever internet is detected.`
        );
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          syncPendingSubmissions().catch(console.error);
        }
        return;
      }
    }

    // 2. Check if it's a survey QR code (extract ?d= payload directly)
    try {
      const { unpackSurvey } = await import('@/lib/surveyPacker');
      const { cacheSurvey } = await import('@/lib/syncEngine');

      let dParam: string | null = null;
      let targetSurveyId: string | null = null;

      if (rawUrl.includes('?d=') || rawUrl.includes('&d=')) {
        try {
          const dummyUrl = new URL(rawUrl, window.location.origin);
          dParam = dummyUrl.searchParams.get('d');
          const match = dummyUrl.pathname.match(/\/s\/([^\/?#]+)/);
          if (match && match[1]) targetSurveyId = match[1];
        } catch {
          const match = rawUrl.match(/[?&]d=([^&#]+)/);
          if (match && match[1]) dParam = match[1];
        }
      }

      if (dParam) {
        const unpacked = unpackSurvey(dParam);
        if (unpacked) {
          await cacheSurvey(unpacked);
          // Navigate to the offline survey shell directly without requiring network
          window.location.href = `/s/${unpacked.id || targetSurveyId || 'offline'}?d=${dParam}`;
          return;
        }
      }

      // 3. Fallback: navigate locally
      try {
        const url = new URL(rawUrl, window.location.origin);
        if (url.pathname.startsWith('/s/')) {
          window.location.href = `${url.pathname}${url.search}`;
          return;
        }
      } catch {}

      window.location.href = rawUrl;
    } catch {
      window.location.href = rawUrl;
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const barcodes = await detector.detect(img);
        if (barcodes.length > 0) {
          handleCodeDetected(barcodes[0].rawValue);
          return;
        }
        alert('No QR code detected in this photo. Please try a clearer picture.');
      } catch (err) {
        console.error('File scan failed:', err);
      }
    } else {
      alert('Photo QR decoding requires modern Android or Chrome browser. Please use your standard phone camera app to scan.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-white/[0.1] rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">Offline QR Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera Feed */}
        <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan target reticle */}
              <div className="absolute inset-8 border-2 border-blue-400 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_12px_#60a5fa] animate-pulse" />
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p>{errorMsg || 'Camera feed unavailable.'}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                You can also scan directly using your phone's native camera app!
              </p>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-950 border-t border-white/[0.08] flex items-center justify-between gap-3 text-xs">
          <label className="flex-1 py-2.5 px-3 bg-white/[0.08] hover:bg-white/[0.12] rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
