import { Download, Share, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { Modal } from '@/components/ui/Modal';

export function InstallBanner() {
  const { t } = useI18n();
  const install = usePwaInstall();

  if (install.isInstalled || install.dismissed || (!install.canPrompt && !install.isIos)) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-xs items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-card lg:bottom-6 lg:right-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy">
          <Download className="h-4 w-4 text-gold-light" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{t('installApp')}</p>
          <p className="text-[11px] text-ink-3">
            {install.canPrompt
              ? 'Install this application on your device.'
              : 'Use the Share menu to add it to your home screen.'}
          </p>
        </div>
        <button
          onClick={install.canPrompt ? install.promptInstall : install.openIosGuide}
          className="shrink-0 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-2"
        >
          {install.canPrompt ? 'Install' : 'How to'}
        </button>
        <button
          onClick={install.dismiss}
          className="shrink-0 rounded p-1 text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
          aria-label="Dismiss install suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {install.isIos && (
        <Modal open={install.iosGuideOpen} onClose={install.closeIosGuide} title={t('installApp')} subtitle="iOS · Safari">
          <ol className="space-y-4" >
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-bg text-[13px] font-semibold text-ink-2">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Tap the Share button</p>
                <p className="mt-0.5 text-xs text-ink-2">The square icon with an up arrow in the Safari toolbar.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-bg text-[13px] font-semibold text-ink-2">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Select “Add to Home Screen”</p>
                <p className="mt-0.5 text-xs text-ink-2">Scroll down the share sheet to find the option.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-bg text-[13px] font-semibold text-ink-2">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Confirm “Add”</p>
                <p className="mt-0.5 text-xs text-ink-2">Fleet FMS will open like a native application.</p>
              </div>
            </li>
          </ol>
          <p className="mt-5 flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-xs text-ink-2">
            <Share className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Offline access requires the app to be installed from the home screen.
          </p>
        </Modal>
      )}
    </>
  );
}