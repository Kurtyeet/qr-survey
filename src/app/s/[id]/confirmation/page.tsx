'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { db, OfflineSubmission } from '@/lib/db';
import { packSubmission } from '@/lib/surveyPacker';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import NetworkBanner from '@/components/NetworkBanner';
import { CheckCircle2, Clock, CloudUpload, ArrowRight, QrCode, User, Briefcase } from 'lucide-react';

export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const surveyId = params?.id as string;
  const submissionId = searchParams?.get('subId');

  const { isOnline } = useNetworkStatus();
  const [submission, setSubmission] = useState<OfflineSubmission | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    const checkStatus = async () => {
      try {
        const item = await db.submissionsQueue.get(submissionId);
        if (item) setSubmission(item);
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 1500);
    return () => clearInterval(timer);
  }, [submissionId]);

  const isSynced = submission?.status === 'synced';
  const qrTransferPayload = submission ? packSubmission(submission) : '';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-12">
      <NetworkBanner surveyId={surveyId} />

      <main className="flex-1 max-w-sm w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card-md p-6 sm:p-8 text-center animate-slide-up">
          {/* Status icon */}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
              isSynced ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {isSynced ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
            ) : (
              <CloudUpload className="w-7 h-7 text-amber-600 animate-pulse" strokeWidth={1.5} />
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-1.5">
            {isSynced ? 'Response Uploaded!' : 'Response Saved on Device!'}
          </h1>

          <p className="text-xs text-slate-500 leading-relaxed mb-5 max-w-xs mx-auto">
            {isSynced
              ? 'Thank you! Your survey response has been transmitted directly to the server.'
              : 'Your answers are safely recorded offline. The admin can scan the QR code below to collect it right now, or your phone will auto-upload when internet reconnects.'}
          </p>

          {/* Respondent detail chip */}
          {submission && (submission.respondentName || submission.respondentRole) && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 mb-5 text-left text-xs text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <User className="w-3.5 h-3.5 text-blue-600" />
                {submission.respondentName || 'Anonymous'}
              </span>
              {submission.respondentRole && (
                <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium text-blue-700">
                  {submission.respondentRole}
                </span>
              )}
            </div>
          )}

          {/* ── OFFLINE PEER-TO-PEER QR CODE TRANSFER ── */}
          {qrTransferPayload && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Admin / Surveyor Transfer QR</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                In an offline area? Have your admin/surveyor scan this screen with their app to collect this survey!
              </p>

              <div className="bg-white p-3 border-2 border-slate-900 rounded-xl inline-block shadow-sm">
                <QRCodeSVG value={qrTransferPayload} size={180} level="M" />
              </div>
            </div>
          )}

          {/* Status detail */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 mb-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Submission ID</span>
              <span className="font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] truncate max-w-[150px]">
                {submissionId ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Auto-Upload</span>
              {isSynced ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  Sent to Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                  <Clock className="w-3 h-3" />
                  Queued Locally
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Network</span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <Link
              href={`/s/${surveyId}`}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-brand-sm"
            >
              Take Another Survey
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="block text-xs text-slate-400 hover:text-slate-600 py-1 transition text-center"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
