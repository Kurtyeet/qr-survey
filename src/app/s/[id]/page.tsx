'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { SurveyData } from '@/types/survey';
import { getCachedSurvey, cacheSurvey } from '@/lib/syncEngine';
import { unpackSurvey } from '@/lib/surveyPacker';
import NetworkBanner from '@/components/NetworkBanner';
import SurveyForm from '@/components/SurveyForm';
import { ClipboardList, AlertCircle, RefreshCw, QrCode } from 'lucide-react';

export default function SurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const surveyId = params?.id as string;
  const packedParam = searchParams?.get('d');

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveSurvey() {
      setLoading(true);
      setError(null);

      // 1. FASTEST & 100% OFFLINE: Decode directly from QR code payload (?d=...)
      if (packedParam) {
        const unpacked = unpackSurvey(packedParam);
        if (unpacked && isMounted) {
          setSurvey(unpacked);
          setSourceLabel('Scanned Offline via QR Code');
          setLoading(false);
          cacheSurvey(unpacked).catch(console.error);
          return;
        }
      }

      // 2. CHECK LOCAL INDEXEDDB CACHE (Offline persistence)
      if (surveyId) {
        try {
          const cached = await getCachedSurvey(surveyId);
          if (cached && isMounted) {
            setSurvey(cached);
            setSourceLabel('Loaded from Device Storage');
            setLoading(false);
            return;
          }
        } catch (cacheErr) {
          console.warn('Cache lookup failed:', cacheErr);
        }
      }

      // 3. IF ONLINE, FETCH FROM SERVER
      if (surveyId && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await fetch(`/api/surveys/${surveyId}`, { cache: 'no-store' });
          if (res.ok) {
            const data: SurveyData = await res.json();
            if (isMounted) {
              setSurvey(data);
              setSourceLabel(null);
              setLoading(false);
              cacheSurvey(data).catch(console.error);
            }
            return;
          }
        } catch (fetchErr) {
          console.warn('Online fetch failed:', fetchErr);
        }
      }

      if (isMounted) {
        setError(
          'Survey not found. If your phone is currently offline, please scan a QR code that includes the offline survey payload.'
        );
        setLoading(false);
      }
    }

    resolveSurvey();

    return () => {
      isMounted = false;
    };
  }, [surveyId, packedParam]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Sticky real-time auto-sync banner */}
      <div className="sticky top-0 z-50">
        <NetworkBanner surveyId={survey?.id || surveyId} />
      </div>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-6 py-6 pb-16">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-fade-in">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Opening survey...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 text-center my-8 animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Cannot Load Survey</h2>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed max-w-xs mx-auto">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-brand-sm transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Survey Content */}
        {!loading && survey && (
          <div className="animate-slide-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 mb-5">
              <div className="flex items-center gap-2 text-blue-600 mb-3">
                <ClipboardList className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-xs font-bold uppercase tracking-widest">Survey</span>
                {sourceLabel && (
                  <span className="ml-auto inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    <QrCode className="w-3 h-3" />
                    {sourceLabel}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1.5">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {survey.description}
                </p>
              )}
            </div>

            <SurveyForm survey={survey} />
          </div>
        )}
      </main>
    </div>
  );
}
