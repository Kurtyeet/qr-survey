import { db, OfflineSubmission } from './db';
import { SurveyData } from '@/types/survey';

// Save survey draft to IndexedDB as user types
export async function saveDraft(surveyId: string, answers: Record<string, any>) {
  try {
    await db.drafts.put({
      surveyId,
      answers,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to save draft to IndexedDB:', error);
  }
}

// Get saved draft for a survey
export async function getDraft(surveyId: string): Promise<Record<string, any> | null> {
  try {
    const draft = await db.drafts.get(surveyId);
    return draft ? draft.answers : null;
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
  answers: Record<string, any>
): Promise<string> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'sub_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  const submission: OfflineSubmission = {
    id,
    surveyId,
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

// Auto-register listener when loaded on client
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Internet restored. Triggering auto-sync...');
    syncPendingSubmissions().catch(console.error);
  });
}
