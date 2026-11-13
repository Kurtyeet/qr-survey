import { db, OfflineSubmission } from './db';
import { SurveyData } from '@/types/survey';

// Save survey draft to IndexedDB as user types
export async function saveDraft(
  surveyId: string,
  answers: Record<string, any>,
  respondentName?: string,
  respondentRole?: string
) {
  try {
    await db.drafts.put({
      surveyId,
      answers,
      respondentName,
      respondentRole,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to save draft to IndexedDB:', error);
  }
}

// Get saved draft for a survey
export async function getDraft(
  surveyId: string
): Promise<{ answers: Record<string, any>; respondentName?: string; respondentRole?: string } | null> {
  try {
    const draft = await db.drafts.get(surveyId);
    return draft
      ? {
          answers: draft.answers,
          respondentName: draft.respondentName,
          respondentRole: draft.respondentRole,
        }
      : null;
  } catch (error) {
    console.error('Failed to read draft from IndexedDB:', error);
    return null;
  }
}

// Clear draft
export async function clearDraft(surveyId: string) {
  try {
    await db.drafts.delete(surveyId);
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
}

// Cache survey schema locally so it can open when completely offline
export async function cacheSurvey(survey: SurveyData) {
  try {
    await db.surveyCache.put({
      surveyId: survey.id,
      data: survey,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to cache survey:', error);
  }
}

// Retrieve cached survey schema
export async function getCachedSurvey(surveyId: string): Promise<SurveyData | null> {
  try {
    const cached = await db.surveyCache.get(surveyId);
    return cached ? cached.data : null;
  } catch (error) {
    console.error('Failed to get cached survey:', error);
    return null;
  }
}

// Queue a new survey submission (works offline or online)
export async function queueSubmission(
  surveyId: string,
  answers: Record<string, any>,
  respondentName?: string,
  respondentRole?: string
): Promise<string> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'sub_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  const submission: OfflineSubmission = {
    id,
    surveyId,
    respondentName,
    respondentRole,
    answers,
    submittedAtClient: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  };

  await db.submissionsQueue.put(submission);

  // If online right now, immediately attempt to sync
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    syncPendingSubmissions(surveyId).catch(console.error);
  }

  return id;
}

// Sync all pending submissions with the server
export async function syncPendingSubmissions(surveyId?: string): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  try {
    const query = surveyId
      ? db.submissionsQueue.where('surveyId').equals(surveyId)
      : db.submissionsQueue.toCollection();

    const pending = await query.filter((item) => item.status === 'pending').toArray();
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        await db.submissionsQueue.update(item.id, { status: 'syncing' });

        const res = await fetch(`/api/surveys/${item.surveyId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: item.id,
            respondentName: item.respondentName,
            respondentRole: item.respondentRole,
            answers: item.answers,
            submittedAtClient: item.submittedAtClient,
            isOfflineSubmission: true,
          }),
        });

        if (res.ok) {
          await db.submissionsQueue.update(item.id, { status: 'synced' });
          await db.drafts.delete(item.surveyId);
          synced++;
        } else {
          const errData = await res.json().catch(() => ({}));
          await db.submissionsQueue.update(item.id, {
            status: 'pending',
            attempts: item.attempts + 1,
            lastError: errData.error || `HTTP ${res.status}`,
          });
          failed++;
        }
      } catch (err: any) {
        await db.submissionsQueue.update(item.id, {
          status: 'pending',
          attempts: item.attempts + 1,
          lastError: err?.message || 'Network fetch failure',
        });
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('Error during syncPendingSubmissions:', error);
    return { synced: 0, failed: 0 };
  }
}

// Auto-register persistent background sync engine on client
if (typeof window !== 'undefined') {
  // 1. Trigger immediately when internet reconnects
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Internet restored. Triggering auto-upload to admin...');
    syncPendingSubmissions().catch(console.error);
  });

  // 2. Trigger when surveyor unlocks phone or switches back to the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncPendingSubmissions().catch(console.error);
    }
  });

  // 3. Heartbeat auto-sync daemon: every 4 seconds silently checks and flushes pending queue
  setInterval(() => {
    if (navigator.onLine) {
      syncPendingSubmissions().catch(console.error);
    }
  }, 4000);

  // 4. Initial startup check
  if (navigator.onLine) {
    setTimeout(() => {
      syncPendingSubmissions().catch(console.error);
    }, 1000);
  }
}
