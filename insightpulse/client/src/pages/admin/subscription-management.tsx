import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  CreditCard, 
  TrendingUp, 
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar
} from 'lucide-react';

interface Subscription {
  id: string;
  organizationId: string;
  organizationName?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate?: string;
  usersLimit: number;
  surveysLimit: number;
  responsesLimit: number;
  currentUsers: number;
  currentSurveys: number;
  currentResponses: number;
}

export default function SubscriptionManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch subscriptions
  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
  });

  // Fetch organizations
  const { data: organizations } = useQuery<any[]>({
    queryKey: ['/api/organizations'],
  });

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async ({ orgId, plan }: { orgId: string; plan: string }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/subscriptions/${orgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });
      if (!response.ok) throw new Error('Failed to update subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      setShowUpgradeDialog(false);
      toast({ title: t('admin.subscriptions.updated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const getPlanLimits = (plan: string) => {
    switch (plan) {
      case 'starter':
        return { users: 10, surveys: 5, responses: 1000 };
      case 'professional':
        return { users: 50, surveys: 25, responses: 10000 };
      case 'enterprise':
        return { users: 999, surveys: 999, responses: 999999 };
      default:
        return { users: 0, surveys: 0, responses: 0 };
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  };

  const isNearLimit = (current: number, limit: number) => {
    const percentage = getUsagePercentage(current, limit);
    return percentage >= 80;
  };

  const handleUpgrade = (orgId: string, newPlan: string) => {
    updateSubscription.mutate({ orgId, plan: newPlan });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const expiringSoon = subscriptions?.filter(s => {
    if (!s.endDate) return false;
    const daysUntilExpiry = Math.floor((new Date(s.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length || 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
              <CreditCard className="w-10 h-10" />
              {t('admin.subscriptions.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.subscriptions.description')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.activeSubsCount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.subscriptions.orgsActive')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.totalRevenue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(activeSubscriptions.length * 99).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.subscriptions.monthlyRecurring')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('common.totalUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptions?.reduce((sum, sub) => sum + sub.currentUsers, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.subscriptions.acrossOrgs')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.expiringSoon')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringSoon}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.subscriptions.within30days')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.subscriptions.subscriptions')}</CardTitle>
            <CardDescription>{t('admin.subscriptions.viewManageSubsPlans')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {subscriptions?.map((sub) => (
                <Card key={sub.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                        <div>
                          <h3 className="text-lg font-semibold">{sub.organizationName || 'Unknown Org'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getPlanColor(sub.plan)}>{sub.plan}</Badge>
                            <Badge className={getStatusColor(sub.status)}>{sub.status}</Badge>
                          </div>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedOrg(sub.organizationId)}>
                            Manage Plan
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('admin.subscriptions.changePlan')}</DialogTitle>
                            <DialogDescription>{t('admin.subscriptions.selectNewPlan', { name: sub.organizationName })}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Select
                              defaultValue={sub.plan}
                              onValueChange={(value) => handleUpgrade(sub.organizationId, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="starter">{t('admin.subscriptions.starter')}</SelectItem>
                                <SelectItem value="professional">{t('admin.subscriptions.professional')}</SelectItem>
                                <SelectItem value="enterprise">{t('admin.subscriptions.enterprise')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                              <p><strong>{t('admin.subscriptions.planDetails')}</strong></p>
                              <p>• {t('common.users')}: {getPlanLimits(sub.plan).users}</p>
                              <p>• {t('common.surveys')}: {getPlanLimits(sub.plan).surveys}</p>
                              <p>• {t('common.responses')}: {getPlanLimits(sub.plan).responses.toLocaleString()}</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Subscription Info */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{t('admin.subscriptions.started')}: {new Date(sub.startDate).toLocaleDateString()}</span>
                      </div>
                      {sub.endDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{t('admin.subscriptions.expires')}: {new Date(sub.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Usage Meters */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {t('common.users')}
                          </span>
                          <span className="font-medium">
                            {sub.currentUsers} / {sub.usersLimit}
                            {isNearLimit(sub.currentUsers, sub.usersLimit) && (
                              <AlertTriangle className="inline w-4 h-4 ml-1 text-amber-500" />
                            )}
                          </span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(sub.currentUsers, sub.usersLimit)} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {t('common.surveys')}
                          </span>
                          <span className="font-medium">
                            {sub.currentSurveys} / {sub.surveysLimit}
                            {isNearLimit(sub.currentSurveys, sub.surveysLimit) && (
                              <AlertTriangle className="inline w-4 h-4 ml-1 text-amber-500" />
                            )}
                          </span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(sub.currentSurveys, sub.surveysLimit)} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {t('common.responses')}
                          </span>
                          <span className="font-medium">
                            {sub.currentResponses.toLocaleString()} / {sub.responsesLimit.toLocaleString()}
                            {isNearLimit(sub.currentResponses, sub.responsesLimit) && (
                              <AlertTriangle className="inline w-4 h-4 ml-1 text-amber-500" />
                            )}
                          </span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(sub.currentResponses, sub.responsesLimit)} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {subscriptions?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>{t('admin.subscriptions.noSubsFound')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
