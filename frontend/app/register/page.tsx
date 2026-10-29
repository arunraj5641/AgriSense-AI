'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
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
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Globe,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RegisterRole = 'farmer' | 'extension_officer' | 'food_processing_unit';

export default function Register() {
  const [selectedRole, setSelectedRole] = useState<RegisterRole>('farmer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Role-specific fields
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [cadre, setCadre] = useState('');
  const [district, setDistrict] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('Horticulture & Grains');

  const router = useRouter();
  const { lang, setLang, t } = useTranslation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error(t('auth.registerErrorEmpty'));
      return;
    }
    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        name: selectedRole === 'food_processing_unit' && companyName ? `${companyName} (${name})` : name,
        email: email.trim(),
        password,
        role: selectedRole,
      };

      await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success(t('auth.registerSuccess'));
      router.push('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.registerErrorGeneric');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions: { id: RegisterRole; title: string; icon: any; desc: string; badge: string }[] = [
    {
      id: 'farmer',
      title: t('auth.roleFarmer'),
      icon: Tractor,
      desc: t('auth.roleFarmerDesc'),
      badge: t('auth.roleFarmerBadge')
    },
    {
      id: 'extension_officer',
      title: t('auth.roleOfficer'),
      icon: ClipboardCheck,
      desc: t('auth.roleOfficerDesc'),
      badge: t('auth.roleOfficerBadge')
    },
    {
      id: 'food_processing_unit',
      title: t('auth.roleCompany'),
      icon: Building2,
      desc: t('auth.roleCompanyDesc'),
      badge: t('auth.roleCompanyBadge')
    }
  ];

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

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-card border-r border-border/60 p-12 flex-col justify-between text-foreground">
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md glow-blue-sm">
              <BrainCircuit className="size-6" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground">AgriSense AI</span>
              <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">{t('auth.roleEcosystem')}</p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-6 my-auto py-12">
          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-3 py-1 font-medium">
            {t('auth.roleTailoredArch')}
          </Badge>

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            {t('auth.registerBrandTitle')}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('auth.registerBrandDesc')}
          </p>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldAlert className="size-4 text-blue-400" />
              <span>{t('auth.adminNoticeTitle')}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('auth.adminNoticeDesc')}
            </p>
          </div>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground">
          <span>{t('auth.securityNotice')}</span>
        </div>
      </div>

      {/* Right Registration Panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-xl space-y-8">
          {/* Mobile Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white mb-3 shadow-md glow-blue-sm">
              <BrainCircuit className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AgriSense AI</h1>
            <p className="text-xs text-muted-foreground mt-1">{t('auth.registerSubtitle')}</p>
          </div>

          <Card className="border-border/60 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.registerTitle')}</CardTitle>
              <CardDescription className="text-sm">
                {t('auth.registerSubtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Role Selection Cards */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('auth.selectRoleLabel')}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedRole === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedRole(opt.id)}
                        className={cn(
                          'flex flex-col text-left p-3.5 rounded-xl border transition-all text-xs relative',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                            : 'border-border bg-card/60 hover:bg-muted/40 hover:border-border/80'
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className={cn('p-1.5 rounded-lg', isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                            <Icon className="size-4" />
                          </div>
                          {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                        </div>
                        <span className="font-bold text-sm text-foreground">{opt.title}</span>
                        <span className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Registration Form */}
              <form onSubmit={handleRegister} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-xs font-semibold text-foreground">
                      {selectedRole === 'food_processing_unit' ? t('auth.repNameLabel') : t('auth.fullNameLabel')} *
                    </Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder={t('auth.fullNamePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-xs font-semibold text-foreground">
                      {selectedRole === 'food_processing_unit' ? t('auth.corpEmailLabel') : t('auth.emailLabel')} *
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-xs font-semibold text-foreground">
                    {t('auth.passwordLabel')} *
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.passwordCreatePlaceholder')}
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

                {/* Role Specific Additional Fields */}
                {selectedRole === 'farmer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="reg-location" className="text-xs font-semibold text-foreground">
                        {t('auth.farmLocationLabel')}
                      </Label>
                      <Input
                        id="reg-location"
                        type="text"
                        placeholder={t('auth.farmLocationPlaceholder')}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone" className="text-xs font-semibold text-foreground">
                        {t('auth.mobilePhoneLabel')}
                      </Label>
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder={t('auth.mobilePhonePlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'extension_officer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="reg-cadre" className="text-xs font-semibold text-foreground">
                        {t('auth.cadreLabel')}
                      </Label>
                      <Input
                        id="reg-cadre"
                        type="text"
                        placeholder={t('auth.cadrePlaceholder')}
                        value={cadre}
                        onChange={(e) => setCadre(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-district" className="text-xs font-semibold text-foreground">
                        {t('auth.districtLabel')}
                      </Label>
                      <Input
                        id="reg-district"
                        type="text"
                        placeholder={t('auth.districtPlaceholder')}
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'food_processing_unit' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="reg-company" className="text-xs font-semibold text-foreground">
                        {t('auth.companyLegalNameLabel')}
                      </Label>
                      <Input
                        id="reg-company"
                        type="text"
                        placeholder={t('auth.companyLegalNamePlaceholder')}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-category" className="text-xs font-semibold text-foreground">
                        {t('auth.processingCategoryLabel')}
                      </Label>
                      <select
                        id="reg-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="Grains & Pulses">{t('auth.catGrains')}</option>
                        <option value="Horticulture & Vegetables">{t('auth.catHorticulture')}</option>
                        <option value="Oilseeds & Edible Oils">{t('auth.catOilseeds')}</option>
                        <option value="Spices & Commercial Crops">{t('auth.catSpices')}</option>
                      </select>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold text-sm mt-2 bg-blue-600 hover:bg-blue-500 text-white shadow-sm glow-blue-sm">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t('auth.provisioning')}
                    </>
                  ) : (
                    <>
                      {t('auth.createRoleAccount')} ({roleOptions.find((r) => r.id === selectedRole)?.title})
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  {t('auth.hasAccount')}{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    {t('auth.signInLink')}
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
