import Link from 'next/link';
import { Leaf, BrainCircuit, BarChart3, Droplets, ArrowRight, Sprout, Shield } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: BrainCircuit,
    title: 'AI-Powered Recommendations',
    description: 'Get intelligent, deterministic recommendations based on your farm resources, soil health, and budget constraints.',
  },
  {
    icon: BarChart3,
    title: 'Resource Management',
    description: 'Track crops, equipment, budget, and soil reports in one centralized dashboard with real-time insights.',
  },
  {
    icon: Droplets,
    title: 'Water-Aware Planning',
    description: 'Optimize irrigation strategies and water usage based on your farm size, crop type, and available resources.',
  },
];

const stats = [
  { value: 'AI-Driven', label: 'Smart Analysis' },
  { value: 'Real-time', label: 'Resource Tracking' },
  { value: '100%', label: 'Deterministic' },
  { value: 'Secure', label: 'Data Protected' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-blue-500/25">
              <BrainCircuit className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">AgriSense AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Sign In
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: 'sm' }), 'glow-blue-sm font-semibold')}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="absolute right-0 top-1/2 size-[400px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400">
              <BrainCircuit className="size-3.5" />
              Intelligent Farm Advisory System
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Smarter Farming with{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                AI-Powered
              </span>{' '}
              Insights
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Get personalized, resource-aware recommendations based on your farm&apos;s size, budget,
              equipment, and water availability. Make data-driven decisions with confidence.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-8 text-base glow-blue-sm font-semibold')}>
                Start Free
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 px-8 text-base border-border/80 hover:bg-surface-elevated')}>
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4 px-4 sm:px-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center py-8 sm:py-10">
              <p className="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage your farm
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From soil analysis to harvest planning, AgriSense AI provides comprehensive tools
              for modern agriculture.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card p-6 transition-base hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-base group-hover:bg-primary/15">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 text-primary">
              <Shield className="size-5" />
              <span className="text-sm font-medium">Trusted by Modern Farmers</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform your farm?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join AgriSense AI today and start making data-driven farming decisions.
            </p>
            <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-12 px-8 text-base')}>
              Get Started for Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="size-4 text-primary" />
            <span>AgriSense AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} AgriSense AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
