import { SurveyData } from '@/types/survey';

/**
 * Compact URL-safe packer for offline QR codes.
 * Stores survey ID, title, description, and questions directly in the QR code.
 */
export function packSurvey(survey: SurveyData): string {
  const compact = {
    i: survey.id,
    t: survey.title,
    d: survey.description || '',
    q: survey.questions.map((q) => ({
      i: q.id,
      t: q.title,
      d: q.description || '',
      y: q.type,
      r: q.required ? 1 : 0,
      o: q.options || [],
    })),
  };

  const jsonStr = JSON.stringify(compact);

  if (typeof window !== 'undefined') {
    return encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
  }
  return encodeURIComponent(Buffer.from(jsonStr).toString('base64'));
}

/**
 * Unpacks survey data from the URL query string `?d=...`
 */
export function unpackSurvey(encodedData: string): SurveyData | null {
  try {
    const raw = decodeURIComponent(encodedData);
    let jsonStr: string;

    if (typeof window !== 'undefined') {
      jsonStr = decodeURIComponent(escape(atob(raw)));
    } else {
      jsonStr = Buffer.from(raw, 'base64').toString('utf-8');
    }

    const compact = JSON.parse(jsonStr);

    return {
      id: compact.i,
      title: compact.t,
      description: compact.d || null,
      slug: compact.i,
      isActive: true,
      questions: compact.q.map((q: any) => ({
        id: q.i,
        title: q.t,
        description: q.d || undefined,
        type: q.y,
        required: Boolean(q.r),
        options: q.o && q.o.length > 0 ? q.o : undefined,
      })),
    };
  } catch (err) {
    console.error('Failed to unpack survey data from QR code:', err);
    return null;
  }
}
