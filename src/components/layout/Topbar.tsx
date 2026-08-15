import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, CheckCheck, Globe, LogOut, Menu, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { initials, timeAgo } from '@/lib/utils';
import { fetchNotifications, markAllNotificationsRead, subscribeNotifications } from '@/services/notificationQueries';
import { isNotificationSoundEnabled, playNotificationSound, setNotificationSoundEnabled } from '@/lib/sound';
import { formatSyncTime, useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { Notification } from '@/types/domain';

export function Topbar({ onOpenSidebar, title }: { onOpenSidebar: () => void; title: string }) {
  const { profile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { online, lastSyncAt } = useOnlineStatus();
  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isNotificationSoundEnabled);
  const [signingOut, setSigningOut] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: Boolean(profile),
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(profile!.id),
    onSuccess: invalidateNotifications,
  });

  useRealtimeNotifications(profile?.id ?? null, (fresh) => {
    if (!notificationAlreadyListed(notifications, fresh?.id)) {
      playNotificationSound();
    }
    invalidateNotifications();
  });

  if (!profile) return null;

  const unread = notifications.filter((n) => !n.is_read).length;

  function toggleSound() {
    setSoundEnabled((v) => {
      const next = !v;
      setNotificationSoundEnabled(next);
      return next;
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
      navigate('/login', { replace: true });
    } catch {
      toast.show('error', 'Unable to sign out');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-4 sm:gap-3 sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-md p-2 text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink lg:hidden"
        aria-label={t('openMenu')}
      >
        <Menu className="h-5 w-5" />
      </button>

      <img src="/favicon.png" alt={settings.org_name} className="h-6 w-6 shrink-0 rounded object-contain" />
      <span className="hidden text-[13px] font-semibold text-ink md:block">{settings.system_name}</span>
      <span className="hidden text-[13px] text-ink-3 md:block" aria-hidden="true">
        /
      </span>
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{title}</h1>

      {!online && (
        <span
          className="hidden items-center gap-1.5 rounded-md border border-warn-border bg-warn-bg px-2.5 py-1 text-[11px] font-semibold text-warn sm:flex"
          title={`${t('lastSync')}: ${formatSyncTime(lastSyncAt)}`}
        >
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          {t('offline')}
        </span>
      )}

      <button
        onClick={() => setLang(lang === 'en' ? 'rw' : 'en')}
        className="flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 transition-colors hover:border-line-dark hover:text-ink"
        aria-label="Switch language"
        title="EN / RW"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {lang === 'en' ? 'EN' : 'RW'}
      </button>

      <div className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />

      <NotificationMenu
        open={notifOpen}
        unread={unread}
        notifications={notifications}
        soundEnabled={soundEnabled}
        onToggle={() => setNotifOpen((v) => !v)}
        onClose={() => setNotifOpen(false)}
        onMarkAll={() => markAll.mutate()}
        onToggleSound={toggleSound}
      />

      <button
        onClick={() => navigate(`/${profile.role}/account`)}
        className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-bg-2"
        aria-label={`${profile.full_name} — ${profile.role}`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
          {initials(profile.full_name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-ink">
            {profile.full_name}
          </span>
          <span className="block text-[10px] uppercase tracking-wide text-ink-3">{profile.role}</span>
        </span>
      </button>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-md p-2 text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink disabled:opacity-50"
        title={t('signOut')}
        aria-label={t('signOut')}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </header>
  );
}

function notificationAlreadyListed(list: Notification[], id?: string): boolean {
  return Boolean(id && list.some((n) => n.id === id));
}

function notifToneClass(type: Notification['type']): string {
  switch (type) {
    case 'success':
      return 'bg-ok';
    case 'error':
      return 'bg-danger';
    case 'warning':
      return 'bg-gold';
    default:
      return 'bg-blue';
  }
}

function useRealtimeNotifications(userId: string | null, onEvent: (n: Notification) => void) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    if (!userId) return;
    return subscribeNotifications(userId, (n) => onEventRef.current(n));
  }, [userId]);
}

function NotificationMenu({
  open,
  unread,
  notifications,
  soundEnabled,
  onToggle,
  onClose,
  onMarkAll,
  onToggleSound,
}: {
  open: boolean;
  unread: number;
  notifications: Notification[];
  soundEnabled: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkAll: () => void;
  onToggleSound: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative rounded-md p-2 text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
        aria-label={`${t('notifications')}${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-white bg-danger px-0.5 text-[9px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
          <div
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line bg-white shadow-card motion-reduce:transition-none"
            role="menu"
            aria-label={t('notifications')}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-ink">{t('notifications')}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleSound}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:bg-bg-2"
                  title={soundEnabled ? 'Notification sound: ON' : 'Notification sound: OFF'}
                  aria-label="Toggle notification sound"
                >
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span className={soundEnabled ? '' : 'text-ink-3'}>Sound</span>
                </button>
                {unread > 0 && (
                  <button
                    onClick={onMarkAll}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-blue transition-colors hover:bg-blue-lt"
                  >
                    <CheckCheck className="h-3 w-3" /> {t('markAllRead')}
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-10 text-center text-xs text-ink-3">{t('noNotifications')}</p>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <div key={n.id} className={`border-b border-line/60 px-3.5 py-2.5 last:border-b-0 ${n.is_read ? '' : 'bg-blue-lt/40'}`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notifToneClass(n.type)}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-ink">{n.title}</span>
                          <span className="shrink-0 text-[10px] text-ink-3">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="mt-0.5 text-xs leading-snug text-ink-2">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}