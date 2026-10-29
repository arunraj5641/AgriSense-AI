'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  Moon,
  Sun,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  Phone,
  MapPin,
  Globe,
  Building2,
  Shield
} from 'lucide-react';
import type { FarmerProfile, User } from '@/types';
import { useTranslation, Language, SUPPORTED_LANGUAGES } from '@/lib/i18n';

export default function SettingsPage() {
  const { lang, setLang, t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [language, setLanguage] = useState<Language>(lang);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const router = useRouter();

  // Load theme preference
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    toast.success(`Switched to ${next ? 'Dark' : 'Light'} mode`);
  };

  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const user: User = await fetchApi('/auth/me');
      setCurrentUser(user);

      if (user.role === 'farmer') {
        try {
          const data: FarmerProfile = await fetchApi('/farmers/me');
          setProfile(data);
          setPhone(data.phone || '');
          setAddress(data.address || '');
          if (data.preferred_language && ['en', 'hi', 'ta', 'fr'].includes(data.preferred_language)) {
            setLanguage(data.preferred_language as Language);
          }
        } catch {
          // Farmer profile not yet created or optional
        }
      }
    } catch {
      router.push('/login');
      return;
    } finally {
      setLoading(false);
    }

    // Health check
    try {
      await fetchApi('/health');
      setApiHealthy(true);
    } catch {
      setApiHealthy(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  // Sync state if i18n lang changes externally
  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
    toast.success(`Language updated to ${SUPPORTED_LANGUAGES.find(l => l.code === newLang)?.label}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentUser?.role === 'farmer') {
        const updated: FarmerProfile = await fetchApi('/farmers/me', {
          method: 'PUT',
          body: JSON.stringify({
            phone: phone || null,
            address: address || null,
            preferred_language: language,
          }),
        });
        setProfile(updated);
      }
      setLang(language);
      toast.success('Settings and preferences saved successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getDashboardHref = () => {
    switch (currentUser?.role) {
      case 'extension_officer':
        return '/officer';
      case 'food_company':
        return '/company';
      case 'admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  return (
    <AppShell
      title={t('settings.title')}
      breadcrumbs={[
        { label: t('nav.dashboard'), href: getDashboardHref() },
        { label: t('nav.settings') },
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: t('nav.dashboard'), href: getDashboardHref() },
            { label: t('nav.settings') },
          ]}
          title={t('settings.title')}
          description={t('settings.subtitle')}
        />

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account & Profile Card */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Account & Profile</CardTitle>
                <CardDescription className="text-xs">
                  Your identity and contact details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={currentUser?.email || ''}
                        disabled
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Role</Label>
                      <Input
                        type="text"
                        value={currentUser?.role ? currentUser.role.replace(/_/g, ' ').toUpperCase() : ''}
                        disabled
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {currentUser?.role === 'farmer' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={saving}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Farm / Physical Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="address"
                            type="text"
                            placeholder="Plot 14, Agri Cluster, Coimbatore"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            disabled={saving}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="preferred-language">{t('settings.languageLabel')}</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        id="preferred-language"
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value as Language)}
                        disabled={saving}
                        className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {SUPPORTED_LANGUAGES.map((langOpt) => (
                          <option key={langOpt.code} value={langOpt.code}>
                            {langOpt.nativeLabel} ({langOpt.label})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 size-4" />
                          Save Preferences
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Appearance & Display Preferences */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription className="text-xs">
                  Theme and display preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      {isDark ? (
                        <Moon className="size-5 text-primary" />
                      ) : (
                        <Sun className="size-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Interface Theme</p>
                      <p className="text-xs text-muted-foreground">
                        {isDark ? 'Dark theme is currently active' : 'Light theme is currently active'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleTheme}>
                    Switch to {isDark ? 'Light' : 'Dark'} Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status & Connectivity */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">System Status</CardTitle>
                <CardDescription className="text-xs">
                  API connectivity and operational status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`size-5 ${
                        apiHealthy === true
                          ? 'text-green-600'
                          : apiHealthy === false
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">Core Backend &amp; DB Services</p>
                      <p className="text-xs text-muted-foreground">
                        {apiHealthy === true
                          ? 'FastAPI core backend service is online and healthy.'
                          : apiHealthy === false
                          ? 'Unable to communicate with API service.'
                          : 'Checking connection...'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={apiHealthy ? 'default' : 'destructive'}>
                    {apiHealthy ? 'Operational' : 'Unavailable'}
                  </Badge>
                </div>

                {currentUser?.created_at && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Account registered</span>
                    <span>{new Date(currentUser.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
