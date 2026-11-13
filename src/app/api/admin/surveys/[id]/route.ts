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
    const { isActive, title, description } = body;

    const updated = await prisma.survey.update({
      where: { id: params.id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(title ? { title } : {}),
        ...(typeof description !== 'undefined' ? { description } : {}),
      },
    });

    return NextResponse.json({
      ...updated,
      questions: JSON.parse(updated.questions),
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
