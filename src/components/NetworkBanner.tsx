'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncPendingSubmissions } from '@/lib/syncEngine';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function NetworkBanner({ surveyId }: { surveyId?: string }) {
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const pendingCount = useLiveQuery(
    async () => {
      try {
        const query = surveyId
          ? db.submissionsQueue.where('surveyId').equals(surveyId)
          : db.submissionsQueue.toCollection();
        return await query.filter((item) => item.status === 'pending').count();
      } catch {
        return 0;
      }
    },
    [surveyId],
    0
  );

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncMessage('Uploading responses…');
    try {
      const result = await syncPendingSubmissions(surveyId);
      setSyncMessage(result.synced > 0
        ? `${result.synced} response${result.synced > 1 ? 's' : ''} synced successfully.`
        : 'Everything is up to date.'
      );
      setTimeout(() => setSyncMessage(null), 3500);
    } catch {
      setSyncMessage('Sync failed — will retry automatically.');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── Online + nothing pending: minimal green strip ── */
  if (isOnline && (pendingCount ?? 0) === 0 && !syncMessage) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200/60 px-4 py-1.5 flex items-center justify-between text-[11px] font-medium text-emerald-700">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          Connected — real-time sync active
        </span>
        <span className="text-emerald-600">All data saved</span>
      </div>
    );
  }

  /* ── Prominent state banner ── */
  const isOffline = !isOnline;
  const hasPending = (pendingCount ?? 0) > 0;

  return (
    <div className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-3 ${
      isOffline
        ? 'bg-amber-500 text-white'
        : hasPending
        ? 'bg-blue-600 text-white'
        : 'bg-emerald-600 text-white'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span>
              <strong>Offline mode</strong> — answers auto-saving to your phone
            </span>
          </>
        ) : (
          <>
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            <span>
              {syncMessage ?? (
                <><strong>{pendingCount}</strong> response{pendingCount !== 1 ? 's' : ''} queued to upload</>
              )}
            </span>
          </>
        )}
      </div>

      {isOnline && hasPending && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="shrink-0 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-[11px] font-semibold transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync now'}
        </button>
      )}
    </div>
  );
}
