import { NextResponse } from 'next/server';
import { getCurrentPassword, getNextPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const currentPwd = getCurrentPassword();
    const nextPwd = getNextPassword();

    // Allow current or next password (to handle edge cases around rotation time)
    // Or just strictly current. Strict is safer, but "Next" allows testing.
    // Let's stick to current.
    
    // Also check generic fallback or env var if we decide to use it.
    const isValid = password === currentPwd || (process.env.CRM_PUBLIC_PASSWORD && password === process.env.CRM_PUBLIC_PASSWORD);

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
    }

    // Set cookie
    const response = NextResponse.json({ success: true });
    
    // Calculate max age (e.g. 15 days, or less)
    const ONE_DAY = 24 * 60 * 60;
    
    response.cookies.set('crm_access_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_DAY, // Re-login every day? Or keep it longer? User asked for 15 day rotation.
                       // Conventionally, session is shorter. Let's do 1 day.
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
