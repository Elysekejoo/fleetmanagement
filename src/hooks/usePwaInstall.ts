import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'fms-install-dismissed';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export interface PwaInstallState {
  canPrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
  dismissed: boolean;
  iosGuideOpen: boolean;
  promptInstall: () => void;
  openIosGuide: () => void;
  closeIosGuide: () => void;
  dismiss: () => void;
}

export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectStandalone);
  const [dismissed, setDismissed] = useState<boolean>(() => window.localStorage.getItem(DISMISS_KEY) === '1');
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };
    const media = window.matchMedia('(display-mode: standalone)');
    const onMediaChange = () => setIsInstalled(media.matches);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onMediaChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onMediaChange);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferred) return;
    void deferred.prompt();
    void deferred.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') setIsInstalled(true);
      setDeferred(null);
    });
  }, [deferred]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  const openIosGuide = useCallback(() => setIosGuideOpen(true), []);
  const closeIosGuide = useCallback(() => setIosGuideOpen(false), []);

  return {
    canPrompt: Boolean(deferred),
    isInstalled,
    isIos: detectIos() && !isInstalled,
    dismissed,
    iosGuideOpen,
    promptInstall,
    openIosGuide,
    closeIosGuide,
    dismiss,
  };
}