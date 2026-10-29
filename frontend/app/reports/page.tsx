'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchApi, API_URL } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { FileText, Download, FileSpreadsheet, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((u) => setCurrentUser(u))
      .catch(() => {});
  }, []);

  const downloadReport = async (endpoint: string, filename: string, format: 'pdf' | 'csv') => {
    const key = `${endpoint}_${format}`;
    setDownloading(key);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/reports/${endpoint}?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to generate report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Error generating report');
    } finally {
      setDownloading(null);
    }
  };

  const role = currentUser?.role;

  return (
    <AppShell
      title={t('report.title')}
      breadcrumbs={[
        { label: 'Portal', href: '/dashboard' },
        { label: 'Report Center' }
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Portal', href: '/dashboard' },
            { label: 'Report Center' }
          ]}
          title={t('report.title')}
          description={t('report.subtitle')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Farmer Report Card */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <span className="text-[11px] text-muted-foreground font-medium">Farmer</span>
              <CardTitle className="text-base mt-0.5">Farm Resource & Sourcing Summary</CardTitle>
              <CardDescription className="text-xs">
                Farms, soil levels, crop stages, and contract agreements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground">
                <p>• Farm acreage &amp; irrigation infrastructure</p>
                <p>• Soil laboratory N-P-K chemical results</p>
                <p>• Projected crop yield &amp; contract revenue</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => downloadReport('farmer-summary', 'agrisense_farmer_summary', 'pdf')}
                  disabled={downloading === 'farmer-summary_pdf'}
                >
                  <FileText className="size-3.5" />
                  {downloading === 'farmer-summary_pdf' ? 'Generating PDF...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => downloadReport('farmer-summary', 'agrisense_farmer_summary', 'csv')}
                  disabled={downloading === 'farmer-summary_csv'}
                >
                  <FileSpreadsheet className="size-3.5" />
                  {downloading === 'farmer-summary_csv' ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extension Officer Report Card */}
          {(role === 'extension_officer' || role === 'admin') && (
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <span className="text-[11px] text-muted-foreground font-medium">Officer</span>
                <CardTitle className="text-base mt-0.5">Review Activity Log</CardTitle>
                <CardDescription className="text-xs">
                  Advisory verifications, approval ratios, and agronomic comments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground">
                  <p>• Certified recommendation timeline</p>
                  <p>• Approval vs. revision determinations</p>
                  <p>• Verification turnaround time statistics</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => downloadReport('officer-activity', 'agrisense_officer_log', 'pdf')}
                    disabled={downloading === 'officer-activity_pdf'}
                  >
                    <FileText className="size-3.5" />
                    {downloading === 'officer-activity_pdf' ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => downloadReport('officer-activity', 'agrisense_officer_log', 'csv')}
                    disabled={downloading === 'officer-activity_csv'}
                  >
                    <FileSpreadsheet className="size-3.5" />
                    {downloading === 'officer-activity_csv' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Procurement Report Card */}
          {(role === 'food_processing_unit' || role === 'admin') && (
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <span className="text-[11px] text-muted-foreground font-medium">Company</span>
                <CardTitle className="text-base mt-0.5">Procurement & Sourcing Audit</CardTitle>
                <CardDescription className="text-xs">
                  Fulfillment progress, contracted farmers, pricing, and delivery dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground">
                  <p>• Quota fulfillment vs. target volume</p>
                  <p>• Verified farmer quality parameters</p>
                  <p>• Sourcing financial commitments</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => downloadReport('company-procurement', 'agrisense_procurement_audit', 'pdf')}
                    disabled={downloading === 'company-procurement_pdf'}
                  >
                    <FileText className="size-3.5" />
                    {downloading === 'company-procurement_pdf' ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => downloadReport('company-procurement', 'agrisense_procurement_audit', 'csv')}
                    disabled={downloading === 'company-procurement_csv'}
                  >
                    <FileSpreadsheet className="size-3.5" />
                    {downloading === 'company-procurement_csv' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Platform Report Card */}
          {role === 'admin' && (
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <span className="text-[11px] text-muted-foreground font-medium">Admin</span>
                <CardTitle className="text-base mt-0.5">Ecosystem Audit</CardTitle>
                <CardDescription className="text-xs">
                  Stakeholder registry, regional crop trends, and compliance metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground">
                  <p>• Platform-wide user role distribution</p>
                  <p>• Agricultural advisory success metrics</p>
                  <p>• Sourcing market volume and contract value</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => downloadReport('admin-platform', 'agrisense_ecosystem_audit', 'pdf')}
                    disabled={downloading === 'admin-platform_pdf'}
                  >
                    <FileText className="size-3.5" />
                    {downloading === 'admin-platform_pdf' ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => downloadReport('admin-platform', 'agrisense_ecosystem_audit', 'csv')}
                    disabled={downloading === 'admin-platform_csv'}
                  >
                    <FileSpreadsheet className="size-3.5" />
                    {downloading === 'admin-platform_csv' ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
