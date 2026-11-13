import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Question } from '@/types/survey';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        submissions: {
          orderBy: { submittedAtClient: 'desc' },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const questions: Question[] = JSON.parse(survey.questions);

    // CSV Headers
    const headers = [
      'Submission ID',
      'Submitted At (Client)',
      'Synced At (Server)',
      'Offline Saved',
      ...questions.map((q) => q.title.replace(/"/g, '""')),
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = survey.submissions.map((sub) => {
      let answers: Record<string, any> = {};
      try {
        answers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
      } catch (e) {
        answers = {};
      }

      const answerCols = questions.map((q) => {
        const ans = answers[q.id];
        if (Array.isArray(ans)) {
          return ans.join(', ');
        }
        return ans ?? '';
      });

      return [
        escapeCsv(sub.id),
        escapeCsv(sub.submittedAtClient.toISOString()),
        escapeCsv(sub.syncedAt.toISOString()),
        escapeCsv(sub.isOfflineSubmission ? 'Yes' : 'No'),
        ...answerCols.map(escapeCsv),
      ].join(',');
    });

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${survey.slug}-responses.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export failed:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
