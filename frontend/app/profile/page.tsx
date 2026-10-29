'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  User,
  Phone,
  MapPin,
  Globe,
  Tractor,
  Sprout,
  Settings as SettingsIcon,
  LogOut,
  Calendar,
  Shield,
} from 'lucide-react';
import type { FarmerProfile, Farm, User as UserType } from '@/types';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const userData = await fetchApi('/auth/me');
      if (!userData) {
        router.push('/login');
        return;
      }
      setCurrentUser(userData);

      if (userData.role === 'farmer') {
        const [profileData, farmsData] = await Promise.all([
          fetchApi('/farmers/me').catch(() => null),
          fetchApi('/farms').catch(() => []),
        ]);
        setProfile(profileData);
        setFarms(farmsData || []);
      } else if (userData.role === 'food_processing_unit') {
        const compData = await fetchApi('/companies/me').catch(() => null);
        setCompany(compData);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const totalAcreage = farms.reduce((sum, f) => sum + (f.farm_size || 0), 0);

  const roleTitle =
    currentUser?.role === 'extension_officer'
      ? 'Extension Officer Profile'
      : currentUser?.role === 'food_processing_unit'
      ? 'Corporate Procurement Profile'
      : currentUser?.role === 'admin'
      ? 'Administrator Profile'
      : 'Farmer Profile';

  const roleDesc =
    currentUser?.role === 'extension_officer'
      ? 'Accredited agricultural extension officer profile, verification credentials, and jurisdiction.'
      : currentUser?.role === 'food_processing_unit'
      ? 'Food processing enterprise profile, commodity sourcing quotas, and partnership status.'
      : currentUser?.role === 'admin'
      ? 'Platform administrator profile, governance privileges, and security audit credentials.'
      : 'Your registered farmer identity, contact info, and farm holdings overview.';

  return (
    <AppShell
      title={roleTitle}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile' },
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Profile' },
          ]}
          title="Profile"
          description={roleDesc}
          actions={
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <SettingsIcon className="mr-1.5 size-3.5" />
              Settings
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-44 rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          </div>
        ) : currentUser ? (
          <div className="space-y-6">
            {/* Primary Profile Card */}
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <User className="size-6" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-foreground">{currentUser.name}</h2>
                      <span className="text-xs text-muted-foreground capitalize">{currentUser.role.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
                  {currentUser.role === 'farmer' ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Phone className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium">{profile?.phone || 'Not provided'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm font-medium">{profile?.address || 'Not provided'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Globe className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Language</p>
                          <p className="text-sm font-medium uppercase">{profile?.preferred_language || 'EN'}</p>
                        </div>
                      </div>
                    </>
                  ) : currentUser.role === 'extension_officer' ? (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Designation</p>
                        <p className="text-sm font-medium">Agricultural Extension Officer</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Accreditation</p>
                        <p className="text-sm font-medium">ICAR / TNAU Agronomist</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Audit Authority</p>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Cryptographic Signing</p>
                      </div>
                    </>
                  ) : currentUser.role === 'food_processing_unit' ? (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Enterprise</p>
                        <p className="text-sm font-medium">{company?.company_name || currentUser.name}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Category</p>
                        <p className="text-sm font-medium">{company?.processing_category || 'Commodity Sourcing'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Procurement Status</p>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active Procurement License</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Governance Scope</p>
                        <p className="text-sm font-medium">Full Platform Administration</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Privilege Tier</p>
                        <p className="text-sm font-medium">Super Administrator</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Operational</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Farm Activity Summary for Farmers */}
            {currentUser.role === 'farmer' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
                  <p className="text-xs text-muted-foreground font-medium">Farms</p>
                  <p className="text-2xl font-semibold text-foreground mt-0.5">{farms.length}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
                  <p className="text-xs text-muted-foreground font-medium">Total Acreage</p>
                  <p className="text-2xl font-semibold text-foreground mt-0.5">{totalAcreage.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ac</span></p>
                </div>
              </div>
            )}

            {/* Account Management & Security */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Session</CardTitle>
                <CardDescription className="text-xs">
                  Manage your active session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4" />
                    Joined Platform
                  </span>
                  <span className="font-medium">
                    {currentUser.created_at
                      ? new Date(currentUser.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Active Member'}
                  </span>
                </div>

                <div className="border-t border-border pt-4 flex justify-end">
                  <Button variant="destructive" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
