import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Ruler, Droplets, ArrowRight, Sprout } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Farm } from '@/types';

interface FarmCardProps {
  farm: Farm;
}

export function FarmCard({ farm }: FarmCardProps) {
  return (
    <Card className="group overflow-hidden transition-base border border-border/80 bg-card shadow-sm hover:border-blue-500/35 hover:-translate-y-0.5">
      {/* Subtle blue accent bar */}
      <div className="h-0.5 bg-blue-500/70" />

      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">{farm.name}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 text-blue-400" />
              <span className="truncate">{farm.location}</span>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 ml-2 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[11px] font-medium">
            <Sprout className="mr-1 size-3" />
            Active
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#111A2B]/60 border border-border/60 px-3 py-2">
            <Ruler className="size-3.5 text-muted-foreground" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Size</p>
              <p className="text-xs font-semibold text-foreground">{farm.farm_size} acres</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#111A2B]/60 border border-border/60 px-3 py-2">
            <Droplets className="size-3.5 text-muted-foreground" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Irrigation</p>
              <p className="text-xs font-semibold text-foreground truncate">{farm.irrigation_type || 'None'}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/60 bg-[#111A2B]/40 px-5 py-3">
        <div className="flex w-full gap-2">
          <Link
            href={`/dashboard/${farm.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 text-xs font-medium border-border/80 bg-[#111A2B] hover:bg-[#1A263D]')}
          >
            Manage
            <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href={`/dashboard/${farm.id}?tab=recommendations`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1 text-xs font-medium text-muted-foreground hover:text-foreground')}
          >
            Advisories
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
