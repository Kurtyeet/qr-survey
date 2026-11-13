import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await prisma.survey.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id },
        ],
        isActive: true,
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found or inactive' }, { status: 404 });
    }

    if (survey.isDraft) {
      return NextResponse.json(
        { error: 'This survey is currently in draft mode and not yet published.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      slug: survey.slug,
      questions: JSON.parse(survey.questions),
      roles: survey.roles ? JSON.parse(survey.roles) : undefined,
      isDraft: survey.isDraft,
      isActive: survey.isActive,
    });
  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json({ error: 'Failed to fetch survey' }, { status: 500 });
  }
}
