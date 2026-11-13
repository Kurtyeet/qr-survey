import Dexie, { Table } from 'dexie';
import { SurveyData } from '@/types/survey';

export interface DraftAnswer {
  surveyId: string;
  answers: Record<string, any>;
  updatedAt: number;
}

export interface OfflineSubmission {
  id: string; // Client UUID for idempotency
  surveyId: string;
  answers: Record<string, any>;
  submittedAtClient: string;
  status: 'pending' | 'syncing' | 'synced';
  attempts: number;
  lastError?: string;
}

export interface CachedSurvey {
  surveyId: string;
  data: SurveyData;
  cachedAt: number;
}

export class SurveyDatabase extends Dexie {
  drafts!: Table<DraftAnswer, string>;
  submissionsQueue!: Table<OfflineSubmission, string>;
  surveyCache!: Table<CachedSurvey, string>;

  constructor() {
    super('OfflineSurveyAppDB');
    this.version(1).stores({
      drafts: 'surveyId',
      submissionsQueue: 'id, surveyId, status, submittedAtClient',
      surveyCache: 'surveyId',
    });
  }
}

export const db = new SurveyDatabase();
