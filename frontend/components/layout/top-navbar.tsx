'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LogOut,
  Menu,
  User as UserIcon,
  Moon,
  Sun,
  Settings,
  Globe,
  Check,
  ShieldCheck,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation, SUPPORTED_LANGUAGES, type LanguageCode } from '@/lib/i18n';
import { fetchApi } from '@/lib/api';
import type { User, NotificationItem } from '@/types';

interface TopNavbarProps {
  onMenuClick: () => void;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function TopNavbar({ onMenuClick, title, breadcrumbs }: TopNavbarProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { lang, setLang, t } = useTranslation();

  const loadNotifications = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetchApi('/notifications?limit=6')
        .then((items: NotificationItem[]) => setNotifications(items || []))
        .catch(() => {});
      fetchApi('/notifications/unread-count')
        .then((res: { unread_count: number }) => setUnreadCount(res?.unread_count || 0))
        .catch(() => {});
    }
  }, []);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) router.push(link);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      void Promise.resolve().then(() => setIsDark(true));
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetchApi('/auth/me')
        .then((user) => setCurrentUser(user))
        .catch(() => {});
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-base"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {!breadcrumbs && title && (
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Select language"
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-base focus-visible:ring-2 focus-visible:ring-ring outline-none"
          >
            <Globe className="size-3.5" />
            <span className="hidden sm:inline">{currentLangObj.nativeLabel}</span>
            <span className="sm:hidden uppercase">{currentLangObj.code}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {SUPPORTED_LANGUAGES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setLang(l.code as LanguageCode)}
              >
                <span>{l.nativeLabel} ({l.label})</span>
                {lang === l.code && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative flex items-center justify-center size-8 rounded-lg border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border transition-base focus-visible:ring-2 focus-visible:ring-ring outline-none"
            aria-label="Open notifications"
          >
            <Bell className="size-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">{t('notif.title')}</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {t('notif.markAllRead')}
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border/40 py-0.5">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {t('notif.empty')}
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.link)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 transition-colors',
                      n.is_read ? 'hover:bg-muted/40' : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {!n.is_read && (
                          <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                        <div className="min-w-0">
                          <p className={cn('text-xs leading-snug', n.is_read ? 'font-medium text-foreground' : 'font-semibold text-foreground')}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border/60 px-3 py-2">
              <Link
                href="/notifications"
                className="block text-center text-xs text-primary font-medium hover:underline"
              >
                View All Notifications
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="User account menu"
            className="flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                {currentUser?.name?.charAt(0)?.toUpperCase() || <UserIcon className="size-3.5" />}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {currentUser && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile')}>
              <UserIcon className="mr-2 size-3.5" />
              {t('nav.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
              <Settings className="mr-2 size-3.5" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 size-3.5" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


