import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...survey,
      questions: JSON.parse(survey.questions),
      roles: survey.roles ? JSON.parse(survey.roles) : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch survey' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { isActive, isDraft, title, description, questions, roles } = body;

    const updated = await prisma.survey.update({
      where: { id: params.id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(typeof isDraft === 'boolean' ? { isDraft } : {}),
        ...(title ? { title } : {}),
        ...(typeof description !== 'undefined' ? { description } : {}),
        ...(questions && Array.isArray(questions) ? { questions: JSON.stringify(questions) } : {}),
        ...(roles && Array.isArray(roles) ? { roles: JSON.stringify(roles) } : {}),
      },
    });

    return NextResponse.json({
      ...updated,
      questions: JSON.parse(updated.questions),
      roles: updated.roles ? JSON.parse(updated.roles) : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.survey.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
  }
}
