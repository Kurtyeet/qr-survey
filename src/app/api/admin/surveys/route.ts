import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    const formatted = surveys.map((s) => ({
      ...s,
      questions: JSON.parse(s.questions),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to list surveys:', error);
    return NextResponse.json({ error: 'Failed to list surveys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, questions } = body;

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Title and questions array are required' }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'survey';
    
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.survey.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description: description || null,
        slug,
        questions: JSON.stringify(questions),
      },
    });

    return NextResponse.json(
      {
        ...survey,
        questions: JSON.parse(survey.questions),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}
