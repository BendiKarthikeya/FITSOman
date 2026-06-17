import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, TrendingUp, MessageSquare, Activity, Shield, Clock, AlertCircle, CheckCircle, Search, Filter, Download, MoreVertical, Eye, Edit2, Copy, Mail, Lock, Plus
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { format } from 'date-fns';
import AdminUserSurveys from '@/components/survey/admin-user-surveys';

interface UserStats {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  surveyCount: number;
  responseCount: number;
  status: 'active' | 'inactive';
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSurveys: number;
  totalResponses: number;
  avgResponseRate: number;
  usersTrend: Array<{ date: string; users: number }>;
  responseTrend: Array<{ date: string; responses: number }>;
  userActivity: UserStats[];
  topSurveys: Array<{
    id: string;
    title: string;
    createdBy: string;
    responseCount: number;
    createdAt: string;
  }>;
}

const AdminDashboardV2: React.FC = () => {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [newRole, setNewRole] = useState('user');
  const user = auth.getUser();
  const { toast } = useToast();

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch dashboard stats
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard-stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Log for debugging
  useEffect(() => {
    if (stats) {
      
    }
    if (error) {
      
    }
  }, [stats, error]);

  const filteredUsers = stats?.userActivity?.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  // User management handlers
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'user',
    organizationId: '',
    departmentId: ''
  });
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch organizations for the invite form
  const { data: organizationsData } = useQuery<{ total: number; items: any[] }>({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const res = await fetch('/api/organizations', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to load organizations');
      return res.json();
    },
  });

  // Fetch departments for the invite form
  const { data: departmentsData } = useQuery<{ total: number; items: any[] }>({
    queryKey: ['/api/departments'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const res = await fetch('/api/departments', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  const handleInviteUser = async () => {
    if (!inviteFormData.email) {
      toast({
        title: t('common.error'),
        description: t('admin.error.emailRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/admin/team/members/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteFormData.email,
          role: inviteFormData.role,
          organizationId: inviteFormData.organizationId || null,
          departmentId: inviteFormData.departmentId || null,
        })
      });
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('admin.success.userInvited'),
        });
        setInviteFormData({
          email: '',
          role: 'user',
          organizationId: '',
          departmentId: ''
        });
        setShowInviteModal(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error || t('admin.error.failedToInvite'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('admin.error.failedToInvite'),
        variant: 'destructive',
      });
    }
  };

  const handleQuickInviteUser = async (email: string) => {
    if (!confirm(`${t('admin.inviteUser')} ${email}?`)) return;
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/admin/team/members/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, role: 'user' })
      });
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('admin.success.userInvited'),
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error || t('admin.error.failedToInvite'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('admin.error.failedToInvite'),
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    if (!confirm(`${t('admin.resetPassword')} ${email}?`)) return;
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/admin/team/members/${userId}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('admin.success.passwordReset'),
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error || t('admin.error.failedToReset'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('admin.error.failedToReset'),
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!confirm(`${newStatus === 'active' ? t('admin.activate') : t('admin.deactivate')} ${t('common.user')}?`)) return;
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/admin/team/members/${userId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: newStatus === 'active' })
      });
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: newStatus === 'active' ? t('admin.success.userActivated') : t('admin.success.userDeactivated'),
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error || t('admin.error.failedToUpdateStatus'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('admin.error.failedToUpdateStatus'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`${t('admin.error.confirmedDelete')}`)) return;
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/admin/team/members/${userId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('admin.success.userDeleted'),
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error || t('admin.error.failedToDelete'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('admin.error.failedToDelete'),
        variant: 'destructive',
      });
    }
  };

  // New handlers for additional features
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleViewUserDetails = (userItem: any) => {
    setSelectedUserDetail(userItem);
    setShowUserDetailsModal(true);
  };

  const handleChangeRole = async (userId: string) => {
    if (!confirm(`${t('admin.permissions.editRole')} ${newRole}?`)) return;
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/admin/team/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: `${t('common.user')} ${t('admin.permissions.editRole')} ${newRole}!`,
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error || t('admin.error.failedToUpdateStatus'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('admin.error.failedToUpdateStatus'),
        variant: 'destructive',
      });
    }
  };

  const handleBulkChangeRole = async (role: string) => {
    if (selectedUsers.size === 0) {
      alert(t('admin.userManagement'));
      return;
    }
    if (!confirm(`${t('admin.permissions.editRole')} ${role} ${selectedUsers.size} ${t('admin.users')}?`)) return;
    
    let successCount = 0;
    const token = localStorage.getItem('insightpulse_token');
    for (const userId of Array.from(selectedUsers)) {
      try {
        const response = await fetch(`/api/admin/team/members/${userId}/role`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role })
        });
        if (response.ok) successCount++;
      } catch (error) {
        
      }
    }
    toast({
      title: 'Success',
      description: `Updated ${successCount} out of ${selectedUsers.size} users`,
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }
    if (!confirm(`Deactivate ${selectedUsers.size} selected users?`)) return;
    
    let successCount = 0;
    const token = localStorage.getItem('insightpulse_token');
    for (const userId of Array.from(selectedUsers)) {
      try {
        const response = await fetch(`/api/admin/team/members/${userId}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ active: false })
        });
        if (response.ok) successCount++;
      } catch (error) {
        
      }
    }
    toast({
      title: 'Success',
      description: `Deactivated ${successCount} out of ${selectedUsers.size} users`,
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }
    if (!confirm(`⚠️ Delete ${selectedUsers.size} selected users? This action cannot be undone.`)) return;
    
    let successCount = 0;
    const token = localStorage.getItem('insightpulse_token');
    for (const userId of Array.from(selectedUsers)) {
      try {
        const response = await fetch(`/api/admin/team/members/${userId}`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) successCount++;
      } catch (error) {
        
      }
    }
    toast({
      title: 'Success',
      description: `Deleted ${successCount} out of ${selectedUsers.size} users`,
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleExportUsers = () => {
    const csvContent = [
      ['Username', 'Email', 'Role', 'Status', 'Surveys', 'Responses', 'Joined Date'].join(','),
      ...filteredUsers.map(u =>
        [u.username, u.email, u.role, u.status, u.surveyCount, u.responseCount, format(new Date(u.createdAt), 'yyyy-MM-dd')].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Failed to load dashboard data'}</p>
          <p className="text-sm text-muted-foreground mb-4">Check console for details</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
          <p className="text-muted-foreground mb-4">Dashboard statistics could not be loaded. You may need to log in as an admin.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Track users, surveys, and system metrics</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>{t('admin.ui.administrator')}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('admin.ui.total')} {t('admin.ui.users')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.activeUsers || 0} {t('admin.ui.active')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('admin.ui.total')} {t('admin.ui.surveys')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSurveys || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.ui.acrossAll')} {t('admin.ui.users')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('admin.ui.total')} {t('admin.ui.responses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalResponses || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All {t('admin.ui.surveys')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('admin.ui.average')} {t('admin.ui.responseRate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.avgResponseRate || 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.ui.systemAverage')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('admin.ui.active')} {t('admin.ui.users')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% {t('admin.ui.percentage')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Trend */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.ui.users')} over time</CardTitle>
              <CardDescription>{t('admin.ui.users')} {t('admin.ui.over')}</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.usersTrend && stats.usersTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.usersTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Response Trend */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.ui.responses')}</CardTitle>
              <CardDescription>{t('admin.ui.surveyResponses')} {t('admin.ui.over')}</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.responseTrend && stats.responseTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.responseTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responses" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">{t('admin.userManagement.title')}</TabsTrigger>
            <TabsTrigger value="surveys">{t('admin.ui.topItem')} {t('admin.ui.surveys')}</TabsTrigger>
            <TabsTrigger value="activity">{t('admin.ui.users')} {t('admin.ui.activity')}</TabsTrigger>
            <TabsTrigger value="user-surveys">{t('admin.ui.surveyManagement')}</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.userManagement.title')}</CardTitle>
                <CardDescription>{t('admin.ui.viewAndManage')} all {t('admin.ui.users')} {t('admin.ui.inTheSystem')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bulk Action Toolbar */}
                {selectedUsers.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="text-sm">
                      <strong>{selectedUsers.size} {selectedUsers.size !== 1 ? t('admin.ui.users') : t('admin.ui.user')} {t('admin.ui.selectedPlural')}</strong>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkChangeRole('admin')}
                        className="text-xs"
                      >
                        {t('admin.ui.makeAdmin')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkChangeRole('user')}
                        className="text-xs"
                      >
                        {t('admin.ui.makeUser')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkDeactivate}
                        className="text-xs"
                      >
                        {t('admin.ui.deactivate')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkDelete}
                        className="text-xs"
                      >
                        {t('common.delete')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUsers(new Set())}
                        className="text-xs"
                      >
                        {t('admin.ui.clearAll')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Filters & Export */}
                <div className="flex gap-4 mb-6 flex-wrap">
                  <div className="relative flex-1 min-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('admin.ui.searchPlaceholder') + ' ' + t('admin.ui.users') + '...'}
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="all">{t('admin.ui.all')} {t('admin.permissions.roles')}</option>
                    <option value="admin">Admin</option>
                    <option value="user">{t('admin.ui.user')}</option>
                  </select>
                  <select
                    className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">{t('admin.ui.all')} {t('common.status')}</option>
                    <option value="active">{t('admin.ui.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportUsers}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Invite User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('admin.ui.emailAddress')}</label>
                          <Input
                            type="email"
                            placeholder="user@example.com"
                            value={inviteFormData.email}
                            onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Role</label>
                          <select
                            value={inviteFormData.role}
                            onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Organization (Optional)</label>
                          <select
                            value={inviteFormData.organizationId}
                            onChange={(e) => setInviteFormData({ ...inviteFormData, organizationId: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                          >
                            <option value="">Select an organization</option>
                            {organizationsData?.items?.map(org => (
                              <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Department (Optional)</label>
                          <select
                            value={inviteFormData.departmentId}
                            onChange={(e) => setInviteFormData({ ...inviteFormData, departmentId: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                            disabled={!inviteFormData.organizationId}
                          >
                            <option value="">Select a department</option>
                            {departmentsData?.items?.filter(dept => 
                              !inviteFormData.organizationId || dept.organizationId === inviteFormData.organizationId
                            ).map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleInviteUser}
                            className="flex-1"
                          >
                            Send Invitation
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowInviteModal(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* User Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                            onChange={handleSelectAll}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>{t('admin.ui.users')}</TableHead>
                        <TableHead>{t('common.role')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('admin.ui.surveys')}</TableHead>
                        <TableHead>{t('admin.ui.responses')}</TableHead>
                        <TableHead>{t('admin.ui.joinedDate')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((userItem) => (
                          <TableRow key={userItem.id} className={selectedUsers.has(userItem.id) ? 'bg-blue-50' : ''}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedUsers.has(userItem.id)}
                                onChange={() => handleSelectUser(userItem.id)}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{userItem.username}</div>
                                <div className="text-sm text-muted-foreground">{userItem.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                                {userItem.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  userItem.status === 'active'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                }
                              >
                                {userItem.status === 'active' ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <Clock className="w-3 h-3 mr-1" />
                                )}
                                {userItem.status === 'active' ? t('admin.ui.active') : t('common.inactive')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{userItem.surveyCount}</TableCell>
                            <TableCell className="text-center">{userItem.responseCount}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(userItem.createdAt), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Dialog open={showUserDetailsModal && selectedUserDetail?.id === userItem.id} onOpenChange={setShowUserDetailsModal}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleViewUserDetails(userItem)}
                                      title="View details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>User Details</DialogTitle>
                                    </DialogHeader>
                                    {selectedUserDetail && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium">{t('admin.ui.username')}</label>
                                          <p className="text-sm text-muted-foreground">{selectedUserDetail.username}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">{t('admin.ui.email')}</label>
                                          <p className="text-sm text-muted-foreground">{selectedUserDetail.email}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">{t('common.role')}</label>
                                          <p className="text-sm text-muted-foreground">{selectedUserDetail.role}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">{t('common.status')}</label>
                                          <p className="text-sm text-muted-foreground">{selectedUserDetail.status}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="text-sm font-medium">{t('admin.ui.surveys')}</label>
                                            <p className="text-sm text-muted-foreground">{selectedUserDetail.surveyCount}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium">{t('admin.ui.responses')}</label>
                                            <p className="text-sm text-muted-foreground">{selectedUserDetail.responseCount}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">{t('admin.ui.joined')}</label>
                                          <p className="text-sm text-muted-foreground">
                                            {format(new Date(selectedUserDetail.createdAt), 'MMM dd, yyyy HH:mm')}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={showRoleChangeModal && selectedUserDetail?.id === userItem.id} onOpenChange={setShowRoleChangeModal}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        setSelectedUserDetail(userItem);
                                        setNewRole(userItem.role);
                                      }}
                                      title="Change role"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Change User Role</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-sm font-medium mb-2 block">Current Role: {userItem.role}</label>
                                        <select
                                          value={newRole}
                                          onChange={(e) => setNewRole(e.target.value)}
                                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                                        >
                                          <option value="user">User</option>
                                          <option value="admin">Admin</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => handleChangeRole(userItem.id)}
                                          className="flex-1"
                                        >
                                          Change Role
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => setShowRoleChangeModal(false)}
                                          className="flex-1"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => handleQuickInviteUser(userItem.email)}
                                  title="Send invite email"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => handleResetPassword(userItem.id, userItem.email)}
                                  title="Reset user password"
                                >
                                  <Lock className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={userItem.status === 'active' ? 'default' : 'secondary'}
                                  className="h-8"
                                  onClick={() => handleToggleStatus(userItem.id, userItem.status)}
                                  title={userItem.status === 'active' ? 'Deactivate user' : 'Activate user'}
                                >
                                  {userItem.status === 'active' ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8"
                                  onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                                  title="Delete user"
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center">
                              <Users className="w-12 h-12 mb-4 opacity-50" />
                              <p className="font-medium mb-2">{t('admin.ui.noUsersFound')}</p>
                              <p className="text-sm">
                                {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                                  ? 'Try adjusting your filters'
                                  : 'No users exist in the system yet'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Surveys Tab */}
          <TabsContent value="surveys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Surveys</CardTitle>
                <CardDescription>Most active surveys across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>{t('admin.ui.surveyTitle')}</TableHead>
                        <TableHead>{t('admin.ui.createdBy')}</TableHead>
                        <TableHead>{t('admin.ui.responses')}</TableHead>
                        <TableHead>{t('admin.ui.createdDate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.topSurveys && stats.topSurveys.length > 0 ? (
                        stats.topSurveys.map((survey) => (
                          <TableRow key={survey.id}>
                            <TableCell className="font-medium">{survey.title}</TableCell>
                            <TableCell>{survey.createdBy}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{survey.responseCount}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(survey.createdAt), 'MMM dd, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('admin.ui.noSurveysAvailable')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.ui.recentActivity')}</CardTitle>
                <CardDescription>{t('admin.ui.trackUserEngagement')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.slice(0, 10).map((userItem) => (
                    <div key={userItem.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{userItem.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {userItem.surveyCount} surveys · {userItem.responseCount} responses
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {userItem.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-800">{t('admin.ui.active')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('common.inactive')}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Joined: {format(new Date(userItem.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Survey Management Tab */}
          <TabsContent value="user-surveys" className="space-y-4">
            <AdminUserSurveys />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboardV2;
