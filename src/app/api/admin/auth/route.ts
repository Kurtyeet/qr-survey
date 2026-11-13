import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { passcode } = await request.json();
    const adminSecret = process.env.ADMIN_SECRET || 'admin123';

    if (passcode === adminSecret) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('admin_auth', 'authenticated', {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_auth');
  return response;
}
