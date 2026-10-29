'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BrainCircuit,
  Loader2,
  Sparkles,
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Recommendation } from '@/types';

interface RecommendationSectionProps {
  farmId: string;
  recommendations: Recommendation[];
  onRecommendationGenerated: (rec: Recommendation) => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  const percent = (score * 100).toFixed(0);
  const variant = score >= 0.8 ? 'default' : score >= 0.5 ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="gap-1">
      <TrendingUp className="size-3" />
      {percent}% confidence
    </Badge>
  );
}

export function RecommendationSection({ farmId, recommendations, onRecommendationGenerated }: RecommendationSectionProps) {
  const [action, setAction] = useState('apply_fertilizer');
  const [submitting, setSubmitting] = useState(false);
  const [latestResult, setLatestResult] = useState<Recommendation | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await fetchApi('/recommendations', {
        method: 'POST',
        body: JSON.stringify({ farm_id: farmId, target_action: action }),
      });
      setLatestResult(result);
      onRecommendationGenerated(result);
      toast.success('Recommendation generated!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate recommendation';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedHistory = showAll ? recommendations : recommendations.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Generate Recommendation */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            AI Recommendation Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecommend} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="target-action">
                Target Action
              </label>
              <select
                id="target-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="apply_fertilizer">Fertilizer Application (NPK &amp; Fertigation)</option>
                <option value="irrigation">Irrigation Scheduling (Moisture Deficit &amp; Drip)</option>
                <option value="pest_control">Pest &amp; Disease Control (IPM Biopesticide)</option>
                <option value="harvest">Crop Harvesting (Combine &amp; Shatter Control)</option>
                <option value="machinery_hire">Machinery Hire (Custom Hiring Centre)</option>
                <option value="seed_selection">Seed Selection &amp; Treatment (Certified Resistant Stock)</option>
                <option value="soil_amendment">Soil Amendment &amp; Conditioning (Gypsum / FYM)</option>
                <option value="crop_protection">Preventive Crop Protection (Sticky Traps &amp; Biocontrol)</option>
                <option value="post_harvest_storage">Post-Harvest Storage (Hermetic PICS / Godown)</option>
                <option value="crop_transportation">Produce Transportation &amp; Mandi Logistics</option>
              </select>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyzing farm data...
                </>
              ) : (
                <>
                  <Zap className="mr-2 size-4" />
                  Generate Recommendation
                </>
              )}
            </Button>
          </form>

          {/* Latest Result */}
          {latestResult && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-background p-5 animate-slide-up">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <BrainCircuit className="size-4 text-primary" />
                  </div>
                  <h4 className="font-semibold">New Recommendation</h4>
                </div>
                <ConfidenceBadge score={latestResult.confidence_score} />
              </div>
              <Separator className="my-4" />
              <p className="font-medium text-foreground">{latestResult.recommendation}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{latestResult.explanation}</p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 font-medium text-primary">
                  <DollarSign className="size-3.5" />
                  Est. Cost: ${latestResult.estimated_cost}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-muted-foreground" />
              Recommendation History
            </CardTitle>
            {recommendations.length > 0 && (
              <Badge variant="secondary">{recommendations.length} total</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <EmptyState
              icon={BrainCircuit}
              title="No recommendations yet"
              description="Generate your first AI recommendation using the form above."
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <div className="space-y-3">
              {displayedHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 transition-base hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{rec.recommendation}</p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{rec.explanation}</p>
                    </div>
                    <ConfidenceBadge score={rec.confidence_score} />
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <DollarSign className="size-3" />
                      ${rec.estimated_cost}
                    </span>
                  </div>
                </div>
              ))}

              {recommendations.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="mr-2 size-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 size-4" />
                      Show All ({recommendations.length - 5} more)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
