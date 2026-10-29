'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  Bell,
  CheckCheck,
  ArrowRight,
  Clock,
  AlertCircle,
  BrainCircuit,
  FileCheck2,
  Handshake,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import type { NotificationItem } from '@/types';

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi(`/notifications?unread_only=${unreadOnly}`);
      setNotifications(data || []);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, router]);

  useEffect(() => {
    void Promise.resolve().then(loadNotifications);
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (link) router.push(link);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Group notifications into Today, Yesterday, and Earlier
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: NotificationItem[] } = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    notifications.forEach((n) => {
      const date = new Date(n.created_at);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() >= today.getTime()) {
        groups.Today.push(n);
      } else if (date.getTime() >= yesterday.getTime()) {
        groups.Yesterday.push(n);
      } else {
        groups.Earlier.push(n);
      }
    });

    return groups;
  }, [notifications]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'RECOMMENDATION_NEW':
      case 'RECOMMENDATION_UPDATED':
        return <BrainCircuit className="size-4 text-primary" />;
      case 'REVIEW_COMPLETED':
      case 'OFFICER_REVIEW':
        return <FileCheck2 className="size-4 text-emerald-600" />;
      case 'CONTRACT_INVITATION':
      case 'CONTRACT_UPDATED':
        return <Handshake className="size-4 text-blue-600" />;
      default:
        return <Bell className="size-4 text-amber-600" />;
    }
  };

  const getActionLabel = (notif: NotificationItem) => {
    if (notif.link?.includes('recommendation')) return 'View Advisory';
    if (notif.link?.includes('contract')) return 'View Contract';
    if (notif.link?.includes('procurement')) return 'View Sourcing Demand';
    return 'View Details';
  };

  return (
    <AppShell
      title="Notification Center"
      breadcrumbs={[
        { label: 'Portal', href: '/dashboard' },
        { label: 'Notifications' }
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Portal', href: '/dashboard' },
            { label: 'Notifications' }
          ]}
          title={t('notif.title')}
          badge={
            unreadCount > 0 ? (
              <span className="text-xs text-muted-foreground font-medium">
                {unreadCount} unread
              </span>
            ) : null
          }
          description="Updates on advisories, reviews, and contracts."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant={unreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className="text-xs font-medium"
              >
                {unreadOnly ? 'Showing Unread' : t('notif.unreadOnly')}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="gap-1.5 text-xs font-medium"
                >
                  <CheckCheck className="size-4" />
                  {t('notif.markAllRead')}
                </Button>
              )}
            </div>
          }
        />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-10 text-center">
              <Bell className="size-8 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">{t('notif.empty')}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You'll receive notifications when there are updates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {(['Today', 'Yesterday', 'Earlier'] as const).map((groupKey) => {
              const items = groupedNotifications[groupKey];
              if (items.length === 0) return null;

              return (
                <div key={groupKey} className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground px-1 pb-1">
                    {groupKey} <span className="text-muted-foreground/50">({items.length})</span>
                  </h3>

                  <div className="space-y-1">
                    {items.map((n) => (
                      <div
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Notification: ${n.title}. ${n.message}`}
                        onClick={() => handleMarkAsRead(n.id, n.link)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void handleMarkAsRead(n.id, n.link);
                          }
                        }}
                        className={`flex items-start justify-between gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          n.is_read
                            ? 'hover:bg-muted/40'
                            : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 shrink-0 mt-0.5">
                            {getIconForType(n.notification_type)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              {!n.is_read && (
                                <span className="size-1.5 rounded-full bg-primary shrink-0" />
                              )}
                              <span className={`text-sm font-medium truncate ${n.is_read ? 'text-foreground' : 'text-foreground'}`}>
                                {n.title}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground/60">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {n.link && (
                          <ArrowRight className="size-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
