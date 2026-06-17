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
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Building2,
  CheckCircle,
  Search
} from 'lucide-react';

interface Department {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
  organizationName?: string;
}

export default function DepartmentManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch departments
  const { data: departmentsData, isLoading } = useQuery<{ total: number; items: Department[] }>({
    queryKey: ['/api/departments'],
  });
  const departments = departmentsData?.items || [];

  // Fetch organizations for dropdown
  const { data: organizations } = useQuery<any[]>({
    queryKey: ['/api/organizations'],
  });

  // Create department mutation
  const createDept = useMutation({
    mutationFn: async (data: { organizationId: string; name: string }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setShowCreateDialog(false);
      toast({ title: t('admin.departments.deptCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update department mutation
  const updateDept = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/departments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setShowEditDialog(false);
      toast({ title: t('admin.departments.deptUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete department mutation
  const deleteDept = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      toast({ title: t('admin.departments.deptDeleted') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createDept.mutate({
      organizationId: formData.get('organizationId') as string,
      name: formData.get('name') as string
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDept) return;
    const formData = new FormData(e.currentTarget);
    updateDept.mutate({
      id: selectedDept.id,
      data: {
        name: formData.get('name') as string,
        isActive: formData.get('isActive') === 'true'
      }
    });
  };

  const handleDelete = (dept: Department) => {
    if (confirm(t('common.confirmDelete', { name: dept.name }))) {
      deleteDept.mutate(dept.id);
    }
  };

  const filteredDepts = departments?.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = selectedOrgFilter === 'all' || dept.organizationId === selectedOrgFilter;
    return matchesSearch && matchesOrg;
  }) || [];

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
              <Layers className="w-10 h-10" />
              {t('admin.departments.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.departments.description')}</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t('admin.departments.createDept')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.departments.createNewDept')}</DialogTitle>
                <DialogDescription>{t('admin.departments.addNewDept')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="organizationId">{t('common.organization')}</Label>
                  <Select name="organizationId" required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectOrg')} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">{t('admin.departments.deptName')}</Label>
                  <Input id="name" name="name" placeholder={t('admin.departments.placeholder.deptName')} required />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createDept.isPending}>
                    {createDept.isPending ? t('common.creating') : t('common.create')}
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
              <CardTitle className="text-sm font-medium">{t('admin.departments.totalDepts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {departments?.filter(d => d.isActive).length || 0} {t('common.active')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('common.totalUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments?.reduce((sum, dept) => sum + (dept.userCount || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.departments.acrossAll')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.departments.avgDeptSize')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments?.length ? 
                  Math.round(departments.reduce((sum, dept) => sum + (dept.userCount || 0), 0) / departments.length) : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.departments.usersPerDept')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('common.organizations')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.departments.withDepts')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Departments Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.departments.departments')}</CardTitle>
            <CardDescription>{t('admin.departments.viewManageDepts')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.departments.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={t('admin.departments.filterPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.departments.allOrgs')}</SelectItem>
                  {organizations?.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.departments.deptName')}</TableHead>
                    <TableHead>{t('common.organization')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.users')}</TableHead>
                    <TableHead>{t('common.created')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepts.length > 0 ? (
                    filteredDepts.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{dept.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {organizations?.find(o => o.id === dept.organizationId)?.name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                            {dept.isActive ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> {t('common.active')}</>
                          ) : (
                            <>{t('common.inactive')}</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{dept.userCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(dept.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDept(dept);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dept)}
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('admin.departments.noDepts')}
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
              <DialogTitle>{t('admin.departments.editDept')}</DialogTitle>
              <DialogDescription>{t('admin.departments.updateDeptDetails')}</DialogDescription>
            </DialogHeader>
            {selectedDept && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">{t('admin.departments.deptName')}</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedDept.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-status">{t('common.status')}</Label>
                  <Select name="isActive" defaultValue={selectedDept.isActive.toString()}>
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
                  <Button type="submit" disabled={updateDept.isPending}>
                    {updateDept.isPending ? t('common.updating') : t('common.update')}
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
