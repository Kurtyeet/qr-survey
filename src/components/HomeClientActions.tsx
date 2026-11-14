'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BarChart3, ArrowRight, Smartphone, Camera } from 'lucide-react';
import OfflineQrScannerModal from './OfflineQrScannerModal';
import InstallPwaButton from './InstallPwaButton';

interface HomeClientActionsProps {
  latestSurveyId?: string;
}

export default function HomeClientActions({ latestSurveyId }: HomeClientActionsProps) {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
        <Link
          href="/admin"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm shadow-brand transition"
        >
          <BarChart3 className="w-4 h-4" />
          Open Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>

        {latestSurveyId && (
          <Link
            href={`/s/${latestSurveyId}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-white font-semibold rounded-xl text-sm transition"
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            Open Survey
          </Link>
        )}

        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-sm transition"
        >
          <Camera className="w-4 h-4 text-emerald-200" />
          Scan Survey QR
        </button>

        <InstallPwaButton />
      </div>

      <OfflineQrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </>
  );
}
