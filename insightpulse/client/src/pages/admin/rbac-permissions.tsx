import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Key,
  Users,
  Lock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  code?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissionCount?: number;
  userCount?: number;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
}

export default function RBACPermissions() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [showCreatePermDialog, setShowCreatePermDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery<{ total: number; items: Permission[] }>({
    queryKey: ['/api/rbac/permissions'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const res = await fetch('/api/rbac/permissions', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to load permissions');
      return res.json();
    },
  });
  const permissions = permissionsData?.items || [];

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery<{ total: number; items: Role[] }>({
    queryKey: ['/api/rbac/roles'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const res = await fetch('/api/rbac/roles', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to load roles');
      return res.json();
    },
  });
  const roles = rolesData?.items || [];

  // Fetch role permissions
  const { data: rolePermissions } = useQuery<RolePermission[]>({
    queryKey: ['/api/rbac/role-permissions'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const res = await fetch('/api/rbac/role-permissions', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) return [];
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.items)) return json.items;
      if (Array.isArray(json?.rolePermissions)) return json.rolePermissions;
      return [];
    },
  });

  // Create role mutation
  const createRole = useMutation({
    mutationFn: async (data: { name: string; description?: string; permissions: string[] }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/role-permissions'] });
      setShowCreateRoleDialog(false);
      setSelectedPermissions([]);
      toast({ title: t('admin.permissions.roleCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/rbac/roles/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/role-permissions'] });
      setShowEditRoleDialog(false);
      toast({ title: t('admin.permissions.roleUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete role mutation
  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/rbac/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/roles'] });
      toast({ title: t('admin.permissions.roleDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Create permission mutation
  const createPermission = useMutation({
    mutationFn: async (data: { resource: string; action: string; description?: string }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/rbac/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: `${data.resource}.${data.action}`,
          name: `${data.resource}:${data.action}`,
          description: data.description,
          category: data.resource
        })
      });
      if (!response.ok) throw new Error('Failed to create permission');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/permissions'] });
      setShowCreatePermDialog(false);
      toast({ title: t('admin.permissions.permissionCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleCreateRoleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRole.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      permissions: selectedPermissions
    });
  };

  const handleEditRoleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRole) return;
    const formData = new FormData(e.currentTarget);
    updateRole.mutate({
      id: selectedRole.id,
      data: {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        permissions: selectedPermissions
      }
    });
  };

  const handleCreatePermSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPermission.mutate({
      resource: formData.get('resource') as string,
      action: formData.get('action') as string,
      description: formData.get('description') as string
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (confirm(t('common.confirmDelete', { name: role.name }))) {
      deleteRole.mutate(role.id);
    }
  };

  const getRolePermissions = (roleId: string) => {
    const list = Array.isArray(rolePermissions) ? rolePermissions : [];
    return list.filter(rp => rp.roleId === roleId).map(rp => rp.permissionId);
  };

  const isLoading = permissionsLoading || rolesLoading;

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
              <Shield className="w-10 h-10" />
              {t('admin.permissions.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.permissions.description')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.permissions.totalRoles')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.permissions.systemRoles')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.permissions.permissions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{permissions?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.permissions.availablePermissions')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('common.totalUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles?.reduce((sum, role) => sum + (role.userCount || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.permissions.withRoles')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Roles and Permissions */}
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="roles">{t('admin.permissions.roles')}</TabsTrigger>
            <TabsTrigger value="permissions">{t('admin.permissions.permissions')}</TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.permissions.createRole')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('admin.permissions.createNewRole')}</DialogTitle>
                    <DialogDescription>{t('admin.permissions.defineNewRole')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('admin.role.name')}</Label>
                      <Input id="name" name="name" placeholder={t('admin.permission.placeholder.roleName')} required />
                    </div>
                    <div>
                      <Label htmlFor="description">{t('common.description')}</Label>
                      <Input id="description" name="description" placeholder={t('admin.permission.placeholder.roleDesc')} />
                    </div>
                    <div>
                      <Label className="mb-2 block">{t('admin.permissions.permissions')}</Label>
                      <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold w-8"></th>
                              <th className="px-4 py-2 text-left font-semibold">{t('admin.permissions.resource')}</th>
                              <th className="px-4 py-2 text-left font-semibold">{t('admin.permissions.action')}</th>
                              <th className="px-4 py-2 text-left font-semibold">{t('common.description')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {permissions?.map(perm => (
                              <tr key={perm.id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-2">
                                  <Checkbox
                                    id={`perm-${perm.id}`}
                                    checked={selectedPermissions.includes(perm.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedPermissions([...selectedPermissions, perm.id]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <label htmlFor={`perm-${perm.id}`} className="cursor-pointer capitalize font-medium">
                                    {perm.resource}
                                  </label>
                                </td>
                                <td className="px-4 py-2">
                                  <label htmlFor={`perm-${perm.id}`} className="cursor-pointer">
                                    <Badge variant="secondary" className="capitalize">{perm.action}</Badge>
                                  </label>
                                </td>
                                <td className="px-4 py-2 text-muted-foreground text-xs">
                                  {perm.description || t('common.noDescription')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setShowCreateRoleDialog(false);
                        setSelectedPermissions([]);
                      }}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={createRole.isPending}>
                        {createRole.isPending ? t('common.creating') : t('admin.permissions.createRole')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.permissions.roles')}</CardTitle>
                <CardDescription>{t('admin.permissions.manageRoles')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold text-foreground">{t('admin.role.name')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('common.description')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('admin.permissions.permissions')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('common.users')}</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles && roles.length > 0 ? (
                        roles.map((role) => (
                          <TableRow key={role.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{role.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs">
                              {role.description || t('common.noDescription')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getRolePermissions(role.id).length} permissions
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{role.userCount || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRole(role);
                                    setSelectedPermissions(getRolePermissions(role.id));
                                    setShowEditRoleDialog(true);
                                  }}
                                  className="hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRole(role)}
                                  className="text-destructive hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t('admin.permissions.noRoles')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {roles && roles.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t('common.total')}: <span className="font-semibold">{roles.length}</span> {t('admin.permissions.roles').toLowerCase()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showCreatePermDialog} onOpenChange={setShowCreatePermDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.permissions.createPermission')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.permissions.createNewPermission')}</DialogTitle>
                    <DialogDescription>{t('admin.permissions.defineNewPermission')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePermSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="resource">{t('admin.permissions.resource')}</Label>
                      <select
                        id="resource"
                        name="resource"
                        required
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="">{t('common.selectResource')}</option>
                        <option value="users">{t('common.users')}</option>
                        <option value="surveys">{t('common.surveys')}</option>
                        <option value="responses">{t('common.responses')}</option>
                        <option value="organizations">{t('common.organizations')}</option>
                        <option value="departments">{t('common.departments')}</option>
                        <option value="reports">{t('common.reports')}</option>
                        <option value="roles">{t('admin.permissions.roles')}</option>
                        <option value="permissions">{t('admin.permissions.permissions')}</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="action">{t('admin.permissions.action')}</Label>
                      <select
                        id="action"
                        name="action"
                        required
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="">{t('common.selectAction')}</option>
                        <option value="create">{t('common.create')}</option>
                        <option value="read">{t('common.read')}</option>
                        <option value="update">{t('common.update')}</option>
                        <option value="delete">{t('common.delete')}</option>
                        <option value="export">{t('common.export')}</option>
                        <option value="import">{t('common.import')}</option>
                        <option value="manage">{t('common.manage')}</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="perm-description">{t('common.description')}</Label>
                      <Input id="perm-description" name="description" placeholder={t('admin.permission.placeholder.permissionDesc')} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreatePermDialog(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={createPermission.isPending}>
                        {createPermission.isPending ? t('common.creating') : t('common.create')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.permissions.permissions')}</CardTitle>
                <CardDescription>{t('admin.permissions.systemPermissions')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="font-semibold text-foreground">{t('admin.permissions.resource')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('admin.permissions.action')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('common.description')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions && permissions.length > 0 ? (
                        permissions.map((perm) => {
                          // Extract resource and action from code (e.g., "users.create" -> "users", "create")
                          const [resource, action] = (perm.code || '').split('.');
                          return (
                            <TableRow key={perm.id} className="hover:bg-muted/30">
                              <TableCell className="text-center">
                                <Lock className="w-5 h-5 text-muted-foreground inline-block" />
                              </TableCell>
                              <TableCell className="font-medium capitalize">{resource || perm.resource || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-medium capitalize">
                                  {action || perm.action || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-md">
                                {perm.description || t('common.noDescription')}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('admin.permissions.noPermissions')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {permissions && permissions.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t('common.total')}: <span className="font-semibold">{permissions.length}</span> {t('admin.permissions.permissions').toLowerCase()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('admin.permissions.editRole')}</DialogTitle>
              <DialogDescription>{t('admin.permissions.updateRoleDetails')}</DialogDescription>
            </DialogHeader>
            {selectedRole && (
              <form onSubmit={handleEditRoleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">{t('admin.role.name')}</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedRole.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-description">{t('common.description')}</Label>
                  <Input id="edit-description" name="description" defaultValue={selectedRole.description || ''} />
                </div>
                <div>
                  <Label className="mb-2 block">{t('admin.permissions.permissions')}</Label>
                  <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold w-8"></th>
                          <th className="px-4 py-2 text-left font-semibold">{t('admin.permissions.resource')}</th>
                          <th className="px-4 py-2 text-left font-semibold">{t('admin.permissions.action')}</th>
                          <th className="px-4 py-2 text-left font-semibold">{t('common.description')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permissions?.map(perm => (
                          <tr key={perm.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <Checkbox
                                id={`edit-perm-${perm.id}`}
                                checked={selectedPermissions.includes(perm.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPermissions([...selectedPermissions, perm.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <label htmlFor={`edit-perm-${perm.id}`} className="cursor-pointer capitalize font-medium">
                                {perm.resource}
                              </label>
                            </td>
                            <td className="px-4 py-2">
                              <label htmlFor={`edit-perm-${perm.id}`} className="cursor-pointer">
                                <Badge variant="secondary" className="capitalize">{perm.action}</Badge>
                              </label>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground text-xs">
                              {perm.description || t('common.noDescription')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowEditRoleDialog(false);
                    setSelectedPermissions([]);
                  }}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateRole.isPending}>
                    {updateRole.isPending ? t('common.updating') : t('common.update')}
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
