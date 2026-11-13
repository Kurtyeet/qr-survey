import { SurveyData } from '@/types/survey';
import { OfflineSubmission } from '@/lib/db';

/**
 * Compact URL-safe packer for offline QR codes.
 * Stores survey ID, title, description, roles, and questions directly in the QR code.
 */
export function packSurvey(survey: SurveyData): string {
  const compact = {
    i: survey.id,
    t: survey.title,
    d: survey.description || '',
    k: survey.roles || [],
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
      roles: compact.k && compact.k.length > 0 ? compact.k : undefined,
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

/**
 * Packs a completed survey submission into a compact string for respondent-to-admin QR code transfer.
 */
export function packSubmission(sub: OfflineSubmission): string {
  const payload = {
    i: sub.id,
    s: sub.surveyId,
    n: sub.respondentName || '',
    r: sub.respondentRole || '',
    a: sub.answers,
    t: sub.submittedAtClient,
  };
  const jsonStr = JSON.stringify(payload);
  const b64 = typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(jsonStr)))
    : Buffer.from(jsonStr).toString('base64');
  return `QRSUB:${b64}`;
}

/**
 * Unpacks a completed survey submission scanned from a respondent's screen.
 */
export function unpackSubmission(rawString: string): OfflineSubmission | null {
  try {
    if (!rawString.startsWith('QRSUB:')) return null;
    const b64 = rawString.substring(6);
    const jsonStr = typeof window !== 'undefined'
      ? decodeURIComponent(escape(atob(b64)))
      : Buffer.from(b64, 'base64').toString('utf-8');
    const p = JSON.parse(jsonStr);

    return {
      id: p.i,
      surveyId: p.s,
      respondentName: p.n || undefined,
      respondentRole: p.r || undefined,
      answers: p.a,
      submittedAtClient: p.t || new Date().toISOString(),
      status: 'pending',
      attempts: 0,
    };
  } catch (e) {
    console.error('Failed to unpack submission QR:', e);
    return null;
  }
}
