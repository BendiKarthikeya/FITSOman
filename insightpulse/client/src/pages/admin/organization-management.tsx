import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
  surveyCount?: number;
  quotaUsed?: number;
  quotaLimit?: number;
}

export default function OrganizationManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch organizations
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  // Create organization mutation
  const createOrg = useMutation({
    mutationFn: async (data: { name: string; plan: string }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setShowCreateDialog(false);
      toast({ title: t('admin.organizations.orgCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update organization mutation
  const updateOrg = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setShowEditDialog(false);
      toast({ title: t('admin.organizations.orgUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete organization mutation
  const deleteOrg = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({ title: t('admin.organizations.orgDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createOrg.mutate({
      name: formData.get('name') as string,
      plan: formData.get('plan') as string
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg) return;
    const formData = new FormData(e.currentTarget);
    updateOrg.mutate({
      id: selectedOrg.id,
      data: {
        name: formData.get('name') as string,
        plan: formData.get('plan') as string,
        isActive: formData.get('isActive') === 'true'
      }
    });
  };

  const handleDelete = (org: Organization) => {
    if (confirm(t('admin.organizations.confirmDelete', { name: org.name }))) {
      deleteOrg.mutate(org.id);
    }
  };

  const filteredOrgs = organizations?.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Building2 className="w-10 h-10" />
              {t('admin.organizations.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.organizations.description')}</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t('admin.organizations.createOrg')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.organizations.createNewOrg')}</DialogTitle>
                <DialogDescription>{t('admin.organizations.addNewOrgToSystem')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('admin.organizations.orgName')}</Label>
                  <Input id="name" name="name" placeholder={t('admin.organizations.placeholder.orgName')} required />
                </div>
                <div>
                  <Label htmlFor="plan">{t('admin.organizations.subscriptionPlan')}</Label>
                  <Select name="plan" defaultValue="professional">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">{t('admin.subscriptions.starter')}</SelectItem>
                      <SelectItem value="professional">{t('admin.subscriptions.professional')}</SelectItem>
                      <SelectItem value="enterprise">{t('admin.subscriptions.enterprise')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createOrg.isPending}>
                    {createOrg.isPending ? t('common.creating') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.organizations.totalOrgs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {organizations?.filter(o => o.isActive).length || 0} {t('common.active')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('common.totalUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations?.reduce((sum, org) => sum + (org.userCount || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.organizations.acrossAll')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.organizations.totalSurveys')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations?.reduce((sum, org) => sum + (org.surveyCount || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.organizations.platformWide')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.organizations.avgQuotaUsage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations?.length ? 
                  Math.round(organizations.reduce((sum, org) => 
                    sum + ((org.quotaUsed || 0) / (org.quotaLimit || 1) * 100), 0) / organizations.length) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.organizations.resourceUtilization')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.organizations.title')}</CardTitle>
            <CardDescription>{t('admin.ui.viewAndManage')} all {t('admin.organizations.title')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.ui.searchPlaceholder') + ' ' + t('admin.organizations.title') + '...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.organizations.organization')}</TableHead>
                    <TableHead>{t('admin.organizations.plan')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.users')}</TableHead>
                    <TableHead>{t('common.surveys')}</TableHead>
                    <TableHead>{t('admin.organizations.quota')}</TableHead>
                    <TableHead>{t('common.created')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.length > 0 ? (
                    filteredOrgs.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{org.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            org.plan === 'enterprise' ? 'default' : 
                            org.plan === 'professional' ? 'secondary' : 'outline'
                          }>
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.isActive ? 'default' : 'secondary'}>
                            {org.isActive ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> {t('common.active')}</>
                            ) : (
                              <><AlertTriangle className="w-3 h-3 mr-1" /> {t('common.inactive')}</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.userCount || 0}</TableCell>
                        <TableCell>{org.surveyCount || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ 
                                  width: `${Math.min(100, ((org.quotaUsed || 0) / (org.quotaLimit || 1)) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {org.quotaUsed || 0}/{org.quotaLimit || 1000}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrg(org);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(org)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('admin.organizations.noOrgsFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.organizations.editOrg')}</DialogTitle>
              <DialogDescription>{t('admin.organizations.updateOrgDetails')}</DialogDescription>
            </DialogHeader>
            {selectedOrg && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">{t('admin.organizations.orgName')}</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedOrg.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-plan">{t('admin.organizations.subscriptionPlan')}</Label>
                  <Select name="plan" defaultValue={selectedOrg.plan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">{t('admin.subscriptions.starter')}</SelectItem>
                      <SelectItem value="professional">{t('admin.subscriptions.professional')}</SelectItem>
                      <SelectItem value="enterprise">{t('admin.subscriptions.enterprise')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">{t('common.status')}</Label>
                  <Select name="isActive" defaultValue={selectedOrg.isActive.toString()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('common.active')}</SelectItem>
                      <SelectItem value="false">{t('common.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateOrg.isPending}>
                    {updateOrg.isPending ? t('common.updating') : t('common.update')}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
