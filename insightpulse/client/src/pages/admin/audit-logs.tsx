import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  FileText, 
  Activity, 
  Shield, 
  User,
  Calendar,
  Filter,
  Download,
  Search,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string;
  username: string;
  eventType: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  metadata?: any;
}

export default function AuditLogs() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const user = auth.getUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch audit logs with explicit fetcher
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/audit-logs'],
    enabled: !!user && user.role === 'admin',
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs', {
        headers: {
          'Authorization': auth.getToken() ? `Bearer ${auth.getToken()}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as any).logs)) return (data as any).logs;
      if (Array.isArray((data as any).items)) return (data as any).items;
      return [];
    },
  });

  // Fetch users for filter with explicit fetcher
  const { data: usersData } = useQuery<{ users: any[] }>({
    queryKey: ['/api/admin/team/members'],
    queryFn: async () => {
      const res = await fetch('/api/admin/team/members', {
        headers: {
          'Authorization': auth.getToken() ? `Bearer ${auth.getToken()}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    },
  });
  
  const users = usersData?.users || [];

  // Ensure logs is always an array
  const logsArray = Array.isArray(logs) ? logs : [];

  const filteredLogs = logsArray.filter(log => {
    const matchesSearch = (log.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = eventFilter === 'all' || log.eventType === eventFilter;
    const matchesUser = userFilter === 'all' || log.userId === userFilter;
    return matchesSearch && matchesEvent && matchesUser;
  });

  const handleExport = () => {
    const csvContent = [
      [t('admin.auditLog.timestamp'), t('admin.auditLog.user'), t('admin.auditLog.event'), t('admin.auditLog.description'), t('admin.auditLog.ipAddress')].join(','),
      ...(filteredLogs.map(log =>
        [
          format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          log.username || 'N/A',
          log.eventType,
          `"${log.description || ''}"`,
          log.ipAddress || 'N/A'
        ].join(',')
      ))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login': return User;
      case 'user_created': return User;
      case 'permission_change': return Shield;
      case 'system_change': return Activity;
      default: return FileText;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'user_created': return 'bg-green-100 text-green-800';
      case 'permission_change': return 'bg-orange-100 text-orange-800';
      case 'system_change': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
              <FileText className="w-10 h-10" />
              {t('admin.auditLog.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.auditLog.subtitle')}</p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t('admin.auditLog.export')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('common.total')} {t('admin.auditLog.event')}s</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logsArray.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.auditLog.allEvents')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.activeUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(logsArray.map(l => l.userId).filter(Boolean)).size}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Unique {t('admin.users')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.auditLog.login')} {t('admin.auditLog.event')}s</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logsArray.filter(l => l.eventType?.includes('login')).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.auditLog.allEvents')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.auditLog.systemChange')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logsArray.filter(l => l.eventType === 'system_change').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.auditLog.configUpdates')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.auditLog.titleActivity')}</CardTitle>
            <CardDescription>{t('admin.auditLog.detailedActivity')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.auditLog.searchLogs')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('admin.auditLog.eventType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.auditLog.allEvents')}</SelectItem>
                  <SelectItem value="login">{t('admin.auditLog.login')}</SelectItem>
                  <SelectItem value="user_created">{t('admin.auditLog.userCreated')}</SelectItem>
                  <SelectItem value="permission_change">{t('admin.auditLog.permissionChange')}</SelectItem>
                  <SelectItem value="system_change">{t('admin.auditLog.systemChange')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('admin.auditLog.user')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.ui.allUsers')}</SelectItem>
                  {users?.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logs Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t('admin.auditLog.timestamp')}</TableHead>
                    <TableHead>{t('admin.auditLog.user')}</TableHead>
                    <TableHead>{t('admin.auditLog.event')}</TableHead>
                    <TableHead>{t('admin.auditLog.description')}</TableHead>
                    <TableHead>{t('admin.auditLog.ipAddress')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                      const Icon = getEventIcon(log.eventType);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">{log.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getEventColor(log.eventType)}>
                              {log.eventType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{log.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.ipAddress || 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">{t('admin.auditLog.noLogsFound')}</p>
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
