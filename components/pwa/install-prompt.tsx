'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tdk-install-dismissed';

export function InstallPrompt() {
  const [evt, setEvt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !evt) return null;

  const install = async () => {
    await evt.prompt();
    await evt.userChoice;
    setShow(false);
  };
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-lg border bg-card p-3 shadow-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Download className="h-4 w-4" />
      </div>
      <div className="flex-1 text-sm">
        <div className="font-medium">Install TDK Tracker</div>
        <div className="text-xs text-muted-foreground">Add to your home screen for quick access.</div>
      </div>
      <Button size="sm" onClick={install}>Install</Button>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
