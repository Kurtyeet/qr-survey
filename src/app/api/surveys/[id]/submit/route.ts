import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { submissionId, answers, submittedAtClient, isOfflineSubmission } = body;

    if (!submissionId || !answers) {
      return NextResponse.json({ error: 'Missing submissionId or answers' }, { status: 400 });
    }

    // Verify survey exists
    const survey = await prisma.survey.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id },
        ],
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Idempotency: Check if this submission was already stored
    const existing = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (existing) {
      return NextResponse.json(
        { success: true, message: 'Submission already recorded (idempotent)', id: existing.id },
        { status: 200 }
      );
    }

    // Create the submission
    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        surveyId: survey.id,
        answers: typeof answers === 'string' ? answers : JSON.stringify(answers),
        submittedAtClient: submittedAtClient ? new Date(submittedAtClient) : new Date(),
        syncedAt: new Date(),
        isOfflineSubmission: Boolean(isOfflineSubmission),
      },
    });

    return NextResponse.json(
      { success: true, id: submission.id, syncedAt: submission.syncedAt },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submission recording error:', error);
    return NextResponse.json({ error: 'Failed to record survey submission' }, { status: 500 });
  }
}
