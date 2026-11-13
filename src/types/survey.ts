export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'rating'
  | 'dropdown';

export interface Question {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For single_choice, multi_choice, dropdown
  minRating?: number; // Default 1
  maxRating?: number; // Default 5
}

export interface SurveyData {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  questions: Question[];
  isActive: boolean;
  createdAt?: string;
  _count?: {
    submissions: number;
  };
}

export interface SubmissionData {
  id: string;
  surveyId: string;
  answers: Record<string, any>;
  submittedAtClient: string;
  syncedAt?: string;
  isOfflineSubmission: boolean;
  createdAt?: string;
}
