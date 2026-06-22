'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile offline_access',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error('Could not start sign-in', { description: error.message });
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Logo priority className="mb-3 h-14 w-auto" />
        <CardTitle className="text-xl">Project Tracker</CardTitle>
        <CardDescription>Engineering operations for TDK Engineering &amp; M&amp;P Engineers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={signIn} disabled={loading} className="w-full" size="lg" variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MicrosoftLogo />}
          Continue with Microsoft
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Access is restricted to <span className="font-medium">@tdkengineering.com</span> and{' '}
          <span className="font-medium">@mpengineers.com</span> accounts.
        </p>
      </CardContent>
    </Card>
  );
}
