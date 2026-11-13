import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { surveyId: params.id },
      orderBy: { submittedAtClient: 'desc' },
    });

    const parsed = submissions.map((sub) => ({
      ...sub,
      answers: typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers,
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Failed to get submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
