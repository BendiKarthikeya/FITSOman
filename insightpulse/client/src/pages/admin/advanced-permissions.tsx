import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  GitBranch,
  Lock,
  Users,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

interface RoleHierarchy {
  id: string;
  name: string;
  parentRoleId?: string;
  level: number;
  permissions: string[];
  delegatedRoles: string[];
}

export default function AdvancedPermissions() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateHierarchy, setShowCreateHierarchy] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleHierarchy | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch permission groups
  const { data: groups, isLoading: groupsLoading } = useQuery<PermissionGroup[]>({
    queryKey: ['/api/rbac/permission-groups'],
  });

  // Fetch role hierarchy
  const { data: roleHierarchy, isLoading: hierarchyLoading } = useQuery<RoleHierarchy[]>({
    queryKey: ['/api/rbac/role-hierarchy'],
  });

  // Create permission group mutation
  const createGroup = useMutation({
    mutationFn: async (data: { name: string; description?: string; permissions: string[] }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/rbac/permission-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create permission group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/permission-groups'] });
      setShowCreateGroup(false);
      toast({ title: t('admin.advancedPermissions.groupCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Create role hierarchy mutation
  const createRoleHierarchy = useMutation({
    mutationFn: async (data: { name: string; parentRoleId?: string; delegatedRoles: string[] }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/rbac/role-hierarchy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create role hierarchy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/role-hierarchy'] });
      setShowCreateHierarchy(false);
      toast({ title: t('admin.advancedPermissions.hierarchyCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete group mutation
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/rbac/permission-groups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac/permission-groups'] });
      toast({ title: t('admin.advancedPermissions.groupDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleCreateGroupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createGroup.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      permissions: []
    });
  };

  const handleCreateHierarchySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRoleHierarchy.mutate({
      name: formData.get('name') as string,
      parentRoleId: formData.get('parentRoleId') as string || undefined,
      delegatedRoles: []
    });
  };

  const isLoading = groupsLoading || hierarchyLoading;

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
              {t('admin.advancedPermissions.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.advancedPermissions.description')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.advancedPermissions.permissionGroups')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.advancedPermissions.bundledPermissions')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.advancedPermissions.roleHierarchy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleHierarchy?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.advancedPermissions.roleLevels')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.advancedPermissions.delegationRules')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roleHierarchy?.reduce((sum, role) => sum + (role.delegatedRoles?.length || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.advancedPermissions.activeDelegations')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="groups">{t('admin.advancedPermissions.permissionGroups')}</TabsTrigger>
            <TabsTrigger value="hierarchy">{t('admin.advancedPermissions.roleHierarchy')}</TabsTrigger>
            <TabsTrigger value="delegation">{t('admin.advancedPermissions.delegation')}</TabsTrigger>
          </TabsList>

          {/* Permission Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Permission Group</DialogTitle>
                    <DialogDescription>Bundle multiple permissions together for easy assignment</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Group Name</Label>
                      <Input id="name" name="name" placeholder="Content Managers" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Can create, edit, and publish content" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateGroup(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createGroup.isPending}>
                        {createGroup.isPending ? 'Creating...' : 'Create Group'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.advancedPermissions.permissionGroups')}</CardTitle>
                <CardDescription>{t('admin.advancedPermissions.groupedPermissionsFaster')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groups && groups.length > 0 ? (
                    groups.map((group) => (
                      <div key={group.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(t('common.confirmDelete', { name: group.name }))) {
                                  deleteGroup.mutate(group.id);
                                }
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.permissions.map((perm) => (
                            <Badge key={perm} variant="secondary">{perm}</Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-6">{t('admin.advancedPermissions.noPermissionGroups')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Hierarchy Tab */}
          <TabsContent value="hierarchy" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showCreateHierarchy} onOpenChange={setShowCreateHierarchy}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.advancedPermissions.createHierarchy')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.advancedPermissions.createRoleHierarchy')}</DialogTitle>
                    <DialogDescription>{t('admin.advancedPermissions.defineRoleInheritance')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateHierarchySubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('admin.role.name')}</Label>
                      <Input id="name" name="name" placeholder={t('admin.advancedPermissions.placeholder.roleName')} required />
                    </div>
                    <div>
                      <Label htmlFor="parentRoleId">{t('admin.advancedPermissions.parentRole')}</Label>
                      <Select name="parentRoleId">
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.advancedPermissions.selectParentRole')} />
                        </SelectTrigger>
                        <SelectContent>
                          {roleHierarchy?.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateHierarchy(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={createRoleHierarchy.isPending}>
                        {createRoleHierarchy.isPending ? t('common.creating') : t('common.create')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.advancedPermissions.roleHierarchy')}</CardTitle>
                <CardDescription>{t('admin.advancedPermissions.parentChildRelationships')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roleHierarchy && roleHierarchy.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                          <TableHead>{t('admin.role.name')}</TableHead>
                          <TableHead>{t('admin.advancedPermissions.level')}</TableHead>
                          <TableHead>{t('admin.advancedPermissions.parentRole')}</TableHead>
                          <TableHead>{t('admin.permissions.permissions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roleHierarchy.map((role) => {
                            const parentRole = roleHierarchy.find(r => r.id === role.parentRoleId);
                            return (
                              <TableRow key={role.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                                  {role.name}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">Level {role.level}</Badge>
                                </TableCell>
                                <TableCell>
                                  {parentRole ? (
                                    <span className="text-sm">{parentRole.name}</span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{t('admin.advancedPermissions.root')}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6">{t('admin.advancedPermissions.noRoleHierarchy')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delegation Tab */}
          <TabsContent value="delegation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.advancedPermissions.permissionDelegation')}</CardTitle>
                <CardDescription>{t('admin.advancedPermissions.configureWhichRoles')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roleHierarchy && roleHierarchy.length > 0 ? (
                    roleHierarchy.map((role) => (
                      <div key={role.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {role.name}
                          </p>
                          <Badge variant={role.delegatedRoles?.length > 0 ? 'default' : 'secondary'}>
                            {role.delegatedRoles?.length || 0} delegations
                          </Badge>
                        </div>
                        {role.delegatedRoles && role.delegatedRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {role.delegatedRoles.map((delegated) => (
                              <Badge key={delegated} variant="outline">{delegated}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No delegated roles</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-6">{t('admin.advancedPermissions.noRolesDelegation')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
