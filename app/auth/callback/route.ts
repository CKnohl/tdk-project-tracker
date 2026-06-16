import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALLOWED_DOMAINS } from '@/lib/constants';

/**
 * OAuth callback. Exchanges the code for a session, then verifies the email
 * domain is allowed (defense in depth — the DB trigger is the hard gate).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error_description') ?? searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-error?reason=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const domain = user?.email?.split('@')[1]?.toLowerCase();

      if (!domain || !ALLOWED_DOMAINS.includes(domain as (typeof ALLOWED_DOMAINS)[number])) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/auth-error?reason=domain`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error?reason=exchange`);
}
