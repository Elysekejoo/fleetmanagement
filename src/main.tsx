import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { queryClient } from '@/lib/queryClient';
import { I18nProvider } from '@/lib/i18n';
import { SettingsProvider } from '@/lib/settings';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { isPwaEnabled } from '@/config/env';
import { unlockAudio } from '@/lib/sound';
import '@/index.css';

const unlock = () => {
  unlockAudio();
  document.removeEventListener('pointerdown', unlock);
  document.removeEventListener('keydown', unlock);
};
document.addEventListener('pointerdown', unlock);
document.addEventListener('keydown', unlock);

if (import.meta.env.PROD && isPwaEnabled && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is optional at runtime.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <SettingsProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SettingsProvider>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);