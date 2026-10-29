'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthApi, fetchApi } from '@/lib/api';
import { useTranslation, SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/i18n';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Leaf,
  BrainCircuit,
  Loader2,
  Eye,
  EyeOff,
  Tractor,
  ClipboardCheck,
  Building2,
  Shield,
  Sparkles,
  ArrowRight,
  Globe,
  Check
} from 'lucide-react';
import type { User } from '@/types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { lang, setLang, t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.loginErrorEmpty'));
      return;
    }
    setSubmitting(true);

    try {
      const params = new URLSearchParams();
      params.append('username', email.trim());
      params.append('password', password);

      const data = await fetchAuthApi('/auth/login', params);
      localStorage.setItem('token', data.access_token);

      // Inspect role immediately and route dynamically
      const user: User = await fetchApi('/auth/me');
      toast.success(`${t('auth.welcomeBack')}, ${user.name}!`);

      if (user.role === 'extension_officer' || user.role === 'agronomist') {
        router.push('/officer');
      } else if (user.role === 'food_processing_unit') {
        router.push('/company');
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.loginErrorInvalid');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (fillEmail: string) => {
    setEmail(fillEmail);
    setPassword('password123');
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row bg-background">
      {/* Top Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Select language"
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-base focus-visible:ring-2 focus-visible:ring-ring outline-none backdrop-blur-sm shadow-xs"
          >
            <Globe className="size-3.5" />
            <span>{currentLangObj.nativeLabel}</span>
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
      </div>

      {/* Left Branding & Value Proposition Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-card border-r border-border/60 p-12 flex-col justify-between text-foreground">
        {/* Ambient glow effects */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        
        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md glow-blue-sm">
              <BrainCircuit className="size-6" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground">AgriSense AI</span>
              <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">{t('auth.brandTagline')}</p>
            </div>
          </Link>
        </div>

        {/* Centerpiece Testimonial / Value Prop */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-12">
          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-3 py-1 gap-1.5 font-medium">
            <Sparkles className="size-3.5" /> {t('auth.brandBadge')}
          </Badge>

          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-foreground">
            {t('auth.brandHeroTitle')}
          </h2>

          <p className="text-base text-muted-foreground leading-relaxed">
            {t('auth.brandHeroDesc')}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
            <div className="space-y-1">
              <span className="text-2xl font-bold text-foreground">100%</span>
              <p className="text-xs text-muted-foreground">{t('auth.statDeterministic')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-bold text-foreground">4 Roles</span>
              <p className="text-xs text-muted-foreground">{t('auth.statRoles')}</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('auth.complianceNotice')}</span>
          <span>© 2026 AgriSense AI</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white mb-3 shadow-md glow-blue-sm">
              <BrainCircuit className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AgriSense AI</h1>
            <p className="text-xs text-muted-foreground mt-1">{t('auth.mobileTagline')}</p>
          </div>

          <Card className="border-border/60 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.loginTitle')}</CardTitle>
              <CardDescription className="text-sm">
                {t('auth.loginSubtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('auth.emailLabel')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('auth.passwordLabel')}
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-sm glow-blue-sm">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t('auth.authenticating')}
                    </>
                  ) : (
                    <>
                      {t('auth.signInButton')}
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* 1-Click Demo Credentials Quick Fill */}
              <div className="space-y-2.5 pt-4 border-t border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block text-center">
                  {t('auth.quickLoginTitle')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('farmer@example.com')}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition-colors text-xs"
                  >
                    <Tractor className="size-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{t('auth.roleFarmer')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">farmer@example.com</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('officer@example.com')}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition-colors text-xs"
                  >
                    <ClipboardCheck className="size-4 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{t('auth.roleOfficer')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">officer@example.com</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('company@example.com')}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition-colors text-xs"
                  >
                    <Building2 className="size-4 text-purple-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{t('auth.roleCompany')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">company@example.com</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@example.com')}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition-colors text-xs"
                  >
                    <Shield className="size-4 text-amber-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{t('auth.roleAdmin')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">admin@example.com</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  {t('auth.noAccount')}{' '}
                  <Link href="/register" className="font-semibold text-primary hover:underline">
                    {t('auth.createAccountLink')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
