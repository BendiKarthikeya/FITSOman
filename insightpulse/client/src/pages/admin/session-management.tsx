import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  Lock, 
  Plus, 
  Edit, 
  Trash2, 
  Shield,
  Smartphone,
  Key,
  LogOut,
  Globe,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface AuditLogEvent {
  id: string;
  userId: string;
  username: string;
  eventType: string; // e.g., 'auth.login'
  status?: string; // 'success' | 'failed'
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  metadata?: any;
}

interface SSOProvider {
  id: string;
  name: string;
  type: 'oauth2' | 'saml' | 'ldap';
  enabled: boolean;
  clientId?: string;
  endpoint?: string;
  createdAt: string;
}

export default function SessionManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [showAddSSO, setShowAddSSO] = useState(false);
  const [selectedSSO, setSelectedSSO] = useState<SSOProvider | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch audit logs and filter for auth.login events
  const { data: auditLogs, isLoading: eventsLoading } = useQuery<AuditLogEvent[]>({
    queryKey: ['/api/admin/audit-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/admin/audit-logs?limit=200', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    }
  });

  // Fetch SSO providers
  const { data: ssoProviders, isLoading: providersLoading } = useQuery<SSOProvider[]>({
    queryKey: ['/api/sso/providers'],
  });

  // Add SSO provider mutation
  const addSSO = useMutation({
    mutationFn: async (data: { type: string; clientId: string; endpoint?: string }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/sso/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add SSO provider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sso/providers'] });
      setShowAddSSO(false);
      toast({ title: t('admin.sessionManagement.ssoAdded') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Toggle SSO mutation
  const toggleSSO = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/sso/providers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
      if (!response.ok) throw new Error('Failed to update SSO provider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sso/providers'] });
      toast({ title: t('admin.sessionManagement.ssoUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete SSO mutation
  const deleteSSO = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/sso/providers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete SSO provider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sso/providers'] });
      toast({ title: t('admin.sessionManagement.ssoDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Revoke session mutation
  const revokeSession = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to revoke session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({ title: t('admin.sessionManagement.sessionRevoked') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleAddSSO = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addSSO.mutate({
      type: formData.get('type') as string,
      clientId: formData.get('clientId') as string,
      endpoint: formData.get('endpoint') as string,
    });
  };

  const handleDeleteSSO = (sso: SSOProvider) => {
    if (confirm(t('common.confirmDelete', { name: sso.name }))) {
      deleteSSO.mutate(sso.id);
    }
  };

  const isLoading = eventsLoading || providersLoading;
  const loginEvents = (auditLogs || []).filter(e => e.eventType === 'auth.login');
  const successfulLogins = loginEvents.filter(e => (e.status || 'success') === 'success').length;
  const enabledProviders = ssoProviders?.filter(p => p.enabled).length || 0;

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
              <Lock className="w-10 h-10" />
              {t('admin.sessionManagement.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.sessionManagement.description')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.sessionManagement.successfulLogins')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successfulLogins}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('common.today')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.sessionManagement.ssoProviders')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ssoProviders?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.sessionManagement.configured', { count: enabledProviders })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.sessionManagement.mfaStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mfaEnabled ? t('common.enabled') : t('common.disabled')}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.sessionManagement.orgWide')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.sessionManagement.passwordPolicy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{passwordRequired ? t('admin.sessionManagement.strict') : t('admin.sessionManagement.standard')}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.sessionManagement.enforcementLevel')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.sessionManagement.securitySettings')}</CardTitle>
            <CardDescription>{t('admin.sessionManagement.configureAuth')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('admin.sessionManagement.mfa')}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.sessionManagement.requireMFA')}</p>
                </div>
              </div>
              <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('admin.sessionManagement.strictPassword')}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.sessionManagement.enforceStrong')}</p>
                </div>
              </div>
              <Switch checked={passwordRequired} onCheckedChange={setPasswordRequired} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">{t('admin.sessionManagement.sessionTimeout')}</p>
                  <p className="text-sm text-amber-700">{t('admin.sessionManagement.autoLogout')}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-50">{t('common.active')}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* SSO Providers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('admin.sessionManagement.ssoProvidersTitle')}</CardTitle>
                <CardDescription>{t('admin.sessionManagement.configureSSOProviders')}</CardDescription>
              </div>
              <Dialog open={showAddSSO} onOpenChange={setShowAddSSO}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.sessionManagement.addProvider')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.sessionManagement.addSSOProvider')}</DialogTitle>
                    <DialogDescription>{t('admin.sessionManagement.configureNewProvider')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSSO} className="space-y-4">
                    <div>
                      <Label htmlFor="type">{t('admin.sessionManagement.providerType')}</Label>
                      <Select name="type" required>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.sessionManagement.selectProviderType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oauth2">{t('admin.sessionManagement.oauth2')}</SelectItem>
                          <SelectItem value="saml">{t('admin.sessionManagement.saml2')}</SelectItem>
                          <SelectItem value="ldap">{t('admin.sessionManagement.ldap')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="clientId">{t('admin.sessionManagement.clientIdKey')}</Label>
                      <Input id="clientId" name="clientId" placeholder={t('admin.sessionManagement.placeholder.clientId')} required />
                    </div>
                    <div>
                      <Label htmlFor="endpoint">{t('admin.sessionManagement.endpointUrl')}</Label>
                      <Input id="endpoint" name="endpoint" placeholder={t('admin.sessionManagement.placeholder.endpointUrl')} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddSSO(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={addSSO.isPending}>
                        {addSSO.isPending ? t('common.adding') : t('admin.sessionManagement.addProvider')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ssoProviders && ssoProviders.length > 0 ? (
                ssoProviders.map((provider) => (
                  <div key={provider.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.type.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                        {provider.enabled ? t('common.enabled') : t('common.disabled')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSSO.mutate({ id: provider.id, enabled: !provider.enabled })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSSO(provider)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-6">{t('admin.sessionManagement.noSSOProviders')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Login Events (from Audit Logs filtered by auth.login) */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.sessionManagement.loginEvents')}</CardTitle>
            <CardDescription>{t('admin.sessionManagement.filteredFromAuditLogs')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.user')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('admin.sessionManagement.ipAddress')}</TableHead>
                    <TableHead>{t('admin.sessionManagement.userAgent')}</TableHead>
                    <TableHead>{t('common.timestamp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginEvents && loginEvents.length > 0 ? (
                    loginEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <span className="font-medium">{event.username || 'Unknown'}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge 
                            variant={(event.status || 'success') === 'success' ? 'default' : 'destructive'}
                            className="capitalize"
                          >
                            {(event.status || 'success') === 'success' ? '✓ ' + t('common.success') : '✗ ' + t('common.failed')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{event.ipAddress || 'unknown'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[240px]">{event.userAgent || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('admin.sessionManagement.noAuthEvents')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
