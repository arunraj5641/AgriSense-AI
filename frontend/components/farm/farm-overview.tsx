'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Ruler, Droplets, Sprout, Wrench, DollarSign, FlaskConical } from 'lucide-react';
import type { Farm, Crop, Equipment, Budget, SoilReport, Recommendation } from '@/types';

interface FarmOverviewProps {
  farm: Farm;
  crops: Crop[];
  equipment: Equipment[];
  budget: Budget | null;
  soilReport: SoilReport | null;
  latestRecommendation: Recommendation | null;
}

export function FarmOverview({ farm, crops, equipment, budget, soilReport, latestRecommendation }: FarmOverviewProps) {
  const resourceStats = [
    { label: 'Crops', value: crops.length, icon: Sprout, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Equipment', value: equipment.length, icon: Wrench, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Budget', value: budget ? `$${budget.available_budget.toFixed(0)}` : 'Not set', icon: DollarSign, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Soil Report', value: soilReport ? 'Available' : 'Pending', icon: FlaskConical, color: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Farm Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Farm Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{farm.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Ruler className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Farm Size</p>
                <p className="font-medium">{farm.farm_size} acres</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Droplets className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Irrigation</p>
                <p className="font-medium">{farm.irrigation_type || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resourceStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="transition-base hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Latest Recommendation */}
      {latestRecommendation && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Latest Recommendation</CardTitle>
              <Badge variant="secondary">
                {(latestRecommendation.confidence_score * 100).toFixed(0)}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-foreground">{latestRecommendation.recommendation}</p>
            <p className="mt-2 text-sm text-muted-foreground">{latestRecommendation.explanation}</p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="font-medium text-primary">
                Est. Cost: ${latestRecommendation.estimated_cost}
              </span>
              <span className="text-muted-foreground">
                {new Date(latestRecommendation.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
