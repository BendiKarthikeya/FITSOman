import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Eye, Download, Trash2, Search, Filter, Calendar, BarChart3, Mail, Clock, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface UserSurveyItem {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  totalSurveysCreated: number;
  totalResponsesReceived: number;
  lastResponseDate: string | null;
  status: 'active' | 'inactive';
  surveyCompletionRate: number;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyTitle: string;
  surveyDescription?: string;
  respondentEmail: string;
  answers: any;
  npsScore: number | null;
  eviScore: number | null;
  csatScore: number | null;
  questionCount?: number;
  submittedAt: string;
  surveyCompleted: boolean;
}

interface UserSurveysData {
  total: number;
  items: UserSurveyItem[];
}

interface UserResponsesData {
  user: {
    id: string;
    username: string;
    email: string;
    createdAt: string;
  };
  total: number;
  responses: SurveyResponse[];
}

const AdminUserSurveys: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<UserSurveyItem | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  // Fetch users with survey summary
  const { data: usersData, isLoading: usersLoading, error: usersError, refetch } = useQuery<UserSurveysData>({
    queryKey: ['admin-users-surveys'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/admin/users-surveys', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users surveys');
      }
      const data = await response.json();
      
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user's surveys when selected
  const { data: responsesData, isLoading: responsesLoading, error: responsesError } = useQuery<UserResponsesData>({
    queryKey: ['user-surveys', selectedUser?.id || ''],
    enabled: !!selectedUser,
    queryFn: async () => {
      if (!selectedUser) throw new Error('No user selected');
      const token = localStorage.getItem('insightpulse_token');
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}/surveys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user surveys');
      }
      const data = await response.json();
      
      return data;
    },
  });

  // Log errors
  React.useEffect(() => {
    if (usersError) {
      
      toast({
        title: 'Error',
        description: `Failed to load users: ${usersError.message}`,
        variant: 'destructive',
      });
    }
  }, [usersError, toast]);

  React.useEffect(() => {
    if (responsesError) {
      
      toast({
        title: 'Error',
        description: `Failed to load responses: ${responsesError.message}`,
        variant: 'destructive',
      });
    }
  }, [responsesError, toast]);

  const filteredUsers = usersData?.items?.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleSelectUser = (user: UserSurveyItem) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleToggleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleExportSurveys = async () => {
    try {
      const userIds = selectedUsers.size > 0 ? Array.from(selectedUsers) : usersData?.items?.map(u => u.id) || [];
      
      const response = await fetch('/api/admin/surveys/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('insightpulse_token')}`,
        },
        body: JSON.stringify({
          userIds,
          format: 'csv',
          dateRange: dateFilter.startDate || dateFilter.endDate ? {
            startDate: dateFilter.startDate,
            endDate: dateFilter.endDate,
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surveys-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Survey data exported successfully',
      });
      setShowExportDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export surveys',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const response = await fetch(`/api/admin/surveys/responses/${responseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('insightpulse_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: 'Success',
        description: 'Response deleted successfully',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete response',
        variant: 'destructive',
      });
    }
  };

  const getSurveyCompletionBadgeColor = (rate: number) => {
    if (rate === 100) return 'bg-green-100 text-green-800';
    if (rate >= 75) return 'bg-blue-100 text-blue-800';
    if (rate >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreBadgeColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-800';
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-blue-100 text-blue-800';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Users Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Survey Management
          </CardTitle>
          <CardDescription>View and manage surveys for each user in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Search Users</label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Filter Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Survey Data</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Start Date (Optional)</label>
                      <Input
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date (Optional)</label>
                      <Input
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedUsers.size > 0 
                        ? `Exporting for ${selectedUsers.size} selected user(s)`
                        : 'Exporting for all users'}
                    </p>
                    <Button onClick={handleExportSurveys} className="w-full">
                      Export as CSV
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                        } else {
                          setSelectedUsers(new Set());
                        }
                      }}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Surveys Created</TableHead>
                  <TableHead>Total Responses</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Last Response</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => handleToggleUserSelect(user.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{user.totalSurveysCreated}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{user.totalResponsesReceived}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSurveyCompletionBadgeColor(user.surveyCompletionRate)}>
                          {user.surveyCompletionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {user.lastResponseDate
                            ? format(new Date(user.lastResponseDate), 'MMM d, yyyy HH:mm')
                            : 'No responses'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectUser(user)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Surveys
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser && `${selectedUser.username}'s Survey Responses`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Username</p>
                      <p className="font-semibold">{selectedUser.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Surveys Created</p>
                      <p className="font-semibold">{selectedUser.totalSurveysCreated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Responses</p>
                      <p className="font-semibold">{selectedUser.totalResponsesReceived}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Survey Responses List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Created Surveys</CardTitle>
                  <CardDescription>
                    {responsesData?.total || 0} survey(s) created by this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {responsesLoading ? (
                    <p className="text-center text-gray-500">Loading responses...</p>
                  ) : !responsesData || responsesData.total === 0 ? (
                    <p className="text-center text-gray-500">No survey responses found</p>
                  ) : (
                    <div className="space-y-4">
                      {responsesData.responses.map((response: SurveyResponse) => (
                        <Card key={response.id} className="bg-gray-50">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-base">{response.surveyTitle}</p>
                                  {response.surveyDescription && (
                                    <p className="text-sm text-gray-600 mt-1">{response.surveyDescription}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteResponse(response.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(response.submittedAt), 'MMM d, yyyy HH:mm')}
                                </Badge>
                                {response.questionCount !== undefined && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {response.questionCount} Question{response.questionCount !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {response.surveyCompleted && (
                                  <Badge className="bg-green-100 text-green-800 gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Completed
                                  </Badge>
                                )}
                              </div>

                              {/* Score Display */}
                              <div className="grid grid-cols-3 gap-3 mt-3">
                                {(response.npsScore !== null && response.npsScore !== undefined) ? (
                                  <div>
                                    <p className="text-xs text-gray-600">NPS Score</p>
                                    <Badge className={getScoreBadgeColor(response.npsScore)}>
                                      {response.npsScore}/10
                                    </Badge>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-gray-600">NPS Score</p>
                                    <Badge variant="outline" className="bg-gray-100">
                                      N/A
                                    </Badge>
                                  </div>
                                )}
                                {(response.eviScore !== null && response.eviScore !== undefined) ? (
                                  <div>
                                    <p className="text-xs text-gray-600">EVI Score</p>
                                    <Badge className={getScoreBadgeColor(response.eviScore)}>
                                      {response.eviScore}/10
                                    </Badge>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-gray-600">EVI Score</p>
                                    <Badge variant="outline" className="bg-gray-100">
                                      N/A
                                    </Badge>
                                  </div>
                                )}
                                {(response.csatScore !== null && response.csatScore !== undefined) ? (
                                  <div>
                                    <p className="text-xs text-gray-600">CSAT Score</p>
                                    <Badge className={getScoreBadgeColor(response.csatScore)}>
                                      {response.csatScore}/10
                                    </Badge>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs text-gray-600">CSAT Score</p>
                                    <Badge variant="outline" className="bg-gray-100">
                                      N/A
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              {/* Answer Preview */}
                              {response.answers && Object.keys(response.answers).length > 0 && (
                                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Responses Preview</p>
                                  <div className="text-xs text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                                    {Object.entries(response.answers).map(([key, value]: [string, any]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserSurveys;
