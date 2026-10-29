'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Tractor,
  BrainCircuit,
  Settings,
  Leaf,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Handshake,
  FileText,
  Building2,
  ShoppingBag,
  Shield,
  Users,
  Bell,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/lib/i18n';
import { fetchApi } from '@/lib/api';
import type { User } from '@/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: number;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetchApi('/auth/me')
        .then((user) => {
          setCurrentUser(user);
          return fetchApi('/notifications/unread-count');
        })
        .then((res) => {
          if (res && typeof res.unread_count === 'number') {
            setUnreadCount(res.unread_count);
          }
        })
        .catch(() => {});
    }
  }, [pathname]);

  const role = currentUser?.role;

  // Role-directed dashboard anchor
  const dashboardHref =
    role === 'extension_officer'
      ? '/officer'
      : role === 'food_processing_unit'
      ? '/company'
      : role === 'admin'
      ? '/admin'
      : '/dashboard';

  let navGroups: NavGroup[] = [];

  if (role === 'extension_officer') {
    navGroups = [
      {
        items: [
          { href: '/officer', label: t('nav.officerQueue') || 'Review Queue', icon: ClipboardCheck },
          { href: '/recommendations', label: t('nav.recommendations') || 'Recommendations', icon: BrainCircuit },
        ]
      },
      {
        items: [
          { href: '/reports', label: t('nav.reports') || 'Reports', icon: FileText },
          { href: '/notifications', label: t('nav.notifications') || 'Notifications', icon: Bell, badge: unreadCount },
          { href: '/settings', label: t('nav.settings') || 'Settings', icon: Settings },
        ]
      },
    ];
  } else if (role === 'food_processing_unit') {
    navGroups = [
      {
        items: [
          { href: '/company', label: t('nav.dashboard') || 'Dashboard', icon: LayoutDashboard },
          { href: '/company/procurements', label: t('nav.companyProcurements') || 'Procurements', icon: ShoppingBag },
          { href: '/company/contracts', label: t('nav.companyContracts') || 'Contracts', icon: Handshake },
        ]
      },
      {
        items: [
          { href: '/notifications', label: t('nav.notifications') || 'Notifications', icon: Bell, badge: unreadCount },
          { href: '/reports', label: t('nav.reports') || 'Reports', icon: FileText },
          { href: '/settings', label: t('nav.settings') || 'Settings', icon: Settings },
        ]
      },
    ];
  } else if (role === 'admin') {
    navGroups = [
      {
        items: [
          { href: '/admin', label: t('nav.dashboard') || 'Dashboard', icon: LayoutDashboard },
          { href: '/admin/users', label: t('nav.adminUsers') || 'Users', icon: Users },
        ]
      },
      {
        items: [
          { href: '/reports', label: t('nav.reports') || 'Reports', icon: FileText },
          { href: '/notifications', label: t('nav.notifications') || 'Notifications', icon: Bell, badge: unreadCount },
          { href: '/settings', label: t('nav.settings') || 'Settings', icon: Settings },
        ]
      },
    ];
  } else {
    // Farmer (default)
    navGroups = [
      {
        items: [
          { href: '/dashboard', label: t('nav.dashboard') || 'Dashboard', icon: LayoutDashboard },
          { href: '/farms', label: t('nav.myFarms') || 'My Farms', icon: Tractor },
          { href: '/recommendations', label: t('nav.recommendations') || 'Recommendations', icon: BrainCircuit },
          { href: '/contracts', label: t('nav.contracts') || 'Contracts', icon: Handshake },
        ]
      },
      {
        items: [
          { href: '/reports', label: t('nav.reports') || 'Reports', icon: FileText },
          { href: '/notifications', label: t('nav.notifications') || 'Notifications', icon: Bell, badge: unreadCount },
          { href: '/settings', label: t('nav.settings') || 'Settings', icon: Settings },
        ]
      },
    ];
  }

  const renderNavItem = (item: NavItem, idx: number) => {
    const isActive =
      pathname === item.href ||
      (item.href === '/farms' && pathname.startsWith('/dashboard/')) ||
      (item.href !== '/dashboard' && item.href !== '/officer' && item.href !== '/company' && item.href !== '/admin' && pathname.startsWith(item.href));
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-base',
          isActive
            ? 'bg-sidebar-accent text-white font-semibold border-l-2 border-primary pl-2.5 shadow-xs'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={cn(
              'size-[16px] shrink-0 transition-base',
              isActive ? 'text-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70'
            )}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </div>

        {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
          <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] font-bold rounded-full">
            {item.badge}
          </Badge>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={`${item.label}-${idx}`}>
          <TooltipTrigger className="w-full text-left">
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
            {typeof item.badge === 'number' && item.badge > 0 ? ` (${item.badge})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={`${item.label}-${idx}`}>{linkContent}</div>;
  };

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href={dashboardHref} className="flex items-center gap-2.5 overflow-hidden" onClick={onNavigate}>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xs">
              <BrainCircuit className="size-3.5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden animate-fade-in">
                <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                  AgriSense AI
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto scrollbar-none">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {gIdx > 0 && (
                <div className="mx-3 my-2 border-t border-sidebar-border/60" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item, iIdx) => renderNavItem(item, iIdx))}
              </div>
            </div>
          ))}
        </nav>

        {/* User info + Toggle */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {!collapsed && currentUser && (
            <Link
              href="/profile"
              onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-base"
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <span className="text-[10px] font-bold">{currentUser.name?.charAt(0)?.toUpperCase() || '?'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sidebar-foreground truncate text-[12px]">{currentUser.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate capitalize">{role?.replace(/_/g, ' ') || 'User'}</p>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
