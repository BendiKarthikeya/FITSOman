import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  FileText, 
  Download, 
  Upload, 
  Plus, 
  Check,
  AlertTriangle,
  Clock,
  Database,
  FileJson
} from 'lucide-react';

interface ImportJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  failedRows: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ExportJob {
  id: string;
  format: 'csv' | 'json' | 'excel';
  status: 'pending' | 'generating' | 'ready' | 'failed';
  rows: number;
  createdAt: string;
  downloadUrl?: string;
}

export default function DataTransfer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch import jobs
  const { data: importJobs, isLoading: importsLoading } = useQuery<ImportJob[]>({
    queryKey: ['/api/data-transfer/imports'],
  });

  // Fetch export jobs
  const { data: exportJobs, isLoading: exportsLoading } = useQuery<ExportJob[]>({
    queryKey: ['/api/data-transfer/exports'],
  });

  // Fetch CSV template
  const downloadTemplate = () => {
    const csvContent = `username,email,organization,department,role,password
john.doe,john@example.com,Acme Corp,Engineering,manager,TempPass123!
jane.smith,jane@example.com,Acme Corp,Engineering,user,TempPass123!
bob.wilson,bob@example.com,Acme Corp,Sales,user,TempPass123!`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-template.csv';
    a.click();
    toast({ title: t('admin.dataTransfer.templateDownloaded') });
  };

  // Upload and import mutation
  const uploadImport = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch('/api/data-transfer/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload file');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-transfer/imports'] });
      setShowImportDialog(false);
      setUploadFile(null);
      toast({ title: t('admin.dataTransfer.fileUploaded') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Export mutation
  const triggerExport = useMutation({
    mutationFn: async (format: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/data-transfer/export?format=${format}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to create export');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-transfer/exports'] });
      setShowExportDialog(false);
      toast({ title: t('admin.dataTransfer.exportJobCreated') });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (uploadFile) {
      uploadImport.mutate(uploadFile);
    }
  };

  const isLoading = importsLoading || exportsLoading;
  const successfulImports = importJobs?.filter(j => j.status === 'completed').length || 0;
  const totalImportedUsers = importJobs?.reduce((sum, job) => sum + (job.status === 'completed' ? job.processedRows : 0), 0) || 0;

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
              <Database className="w-10 h-10" />
              {t('admin.dataTransfer.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.dataTransfer.description')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.dataTransfer.importsCompleted')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successfulImports}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.dataTransfer.successfulJobs')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.dataTransfer.usersImported')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImportedUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.dataTransfer.viaBulkImport')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.dataTransfer.activeExports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exportJobs?.filter(j => j.status !== 'ready').length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.dataTransfer.inProgress')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.dataTransfer.readyDownloads')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exportJobs?.filter(j => j.status === 'ready').length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('admin.dataTransfer.available')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {t('admin.dataTransfer.bulkImportUsers')}
                  </CardTitle>
                  <CardDescription>{t('admin.dataTransfer.uploadCSVFile')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t('admin.dataTransfer.importMultipleUsers')}</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.dataTransfer.bulkImportUsers')}</DialogTitle>
                <DialogDescription>{t('admin.dataTransfer.uploadCSVDescription')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div>
                  <Label className="mb-2 block">{t('admin.dataTransfer.csvFormat')}</Label>
                  <div className="bg-muted p-3 rounded text-sm font-mono text-xs mb-4">
                    <div>username, email, organization, department, role, password</div>
                    <div className="text-muted-foreground mt-2">
                      john.doe, john@example.com, Acme, Engineering, manager, TempPass123!
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 mb-4"
                  >
                    <Download className="w-4 h-4" />
                    {t('admin.dataTransfer.downloadTemplate')}
                  </Button>
                </div>
                <div>
                  <Label htmlFor="file">{t('admin.dataTransfer.selectCSVFile')}</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    required
                  />
                  {uploadFile && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      {uploadFile.name} {t('admin.dataTransfer.selected')}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowImportDialog(false);
                    setUploadFile(null);
                  }}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={uploadImport.isPending || !uploadFile}>
                    {uploadImport.isPending ? t('common.uploading') : t('admin.dataTransfer.import')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    {t('admin.dataTransfer.exportAllUsers')}
                  </CardTitle>
                  <CardDescription>{t('admin.dataTransfer.downloadUserData')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t('admin.dataTransfer.exportFormats')}</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.dataTransfer.exportUsers')}</DialogTitle>
                <DialogDescription>{t('admin.dataTransfer.selectExportFormat')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Button
                  onClick={() => triggerExport.mutate('csv')}
                  className="w-full flex items-center gap-2 justify-center"
                  disabled={triggerExport.isPending}
                >
                  <FileText className="w-4 h-4" />
                  {t('admin.dataTransfer.exportCSV')}
                </Button>
                <Button
                  onClick={() => triggerExport.mutate('json')}
                  className="w-full flex items-center gap-2 justify-center"
                  disabled={triggerExport.isPending}
                  variant="outline"
                >
                  <FileJson className="w-4 h-4" />
                  {t('admin.dataTransfer.exportJSON')}
                </Button>
                <Button
                  onClick={() => triggerExport.mutate('excel')}
                  className="w-full flex items-center gap-2 justify-center"
                  disabled={triggerExport.isPending}
                  variant="outline"
                >
                  <FileText className="w-4 h-4" />
                  {t('admin.dataTransfer.exportExcel')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="imports" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="imports">{t('admin.dataTransfer.importHistory')}</TabsTrigger>
            <TabsTrigger value="exports">{t('admin.dataTransfer.exportHistory')}</TabsTrigger>
          </TabsList>

          {/* Imports Tab */}
          <TabsContent value="imports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.dataTransfer.importHistory')}</CardTitle>
                <CardDescription>{t('admin.dataTransfer.trackBulkImportJobs')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.dataTransfer.filename')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('admin.dataTransfer.progress')}</TableHead>
                        <TableHead>{t('admin.dataTransfer.results')}</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importJobs && importJobs.length > 0 ? (
                        importJobs.map((job) => {
                          const progress = job.totalRows > 0 ? (job.processedRows / job.totalRows) * 100 : 0;
                          return (
                            <TableRow key={job.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{job.filename}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    job.status === 'completed' ? 'default' :
                                    job.status === 'failed' ? 'destructive' :
                                    'secondary'
                                  }
                                >
                                  {job.status === 'processing' ? (
                                    <>
                                      <Clock className="w-3 h-3 mr-1 animate-spin" />
                                      {t('admin.dataTransfer.processing')}
                                    </>
                                  ) : (
                                    t(`admin.dataTransfer.${job.status}`)
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="w-32">
                                  <Progress value={progress} className="h-2" />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {job.processedRows}/{job.totalRows}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="space-y-1">
                                  <p>✓ {job.processedRows}</p>
                                  {job.failedRows > 0 && (
                                    <p className="text-destructive flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {job.failedRows} failed
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(job.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('admin.dataTransfer.noImportHistory')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exports Tab */}
          <TabsContent value="exports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.dataTransfer.exportHistory')}</CardTitle>
                <CardDescription>{t('admin.dataTransfer.downloadPreviously')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exportJobs && exportJobs.length > 0 ? (
                    exportJobs.map((job) => (
                      <div key={job.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">Export - {job.format.toUpperCase()}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <FileText className="w-4 h-4" />
                            <span>{job.rows} rows</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={
                              job.status === 'ready' ? 'default' :
                              job.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {job.status === 'generating' ? (
                              <>
                                <Clock className="w-3 h-3 mr-1 animate-spin" />
                                {t('admin.dataTransfer.generating')}
                              </>
                            ) : (
                              t(`admin.dataTransfer.${job.status}`)
                            )}
                          </Badge>
                          {job.status === 'ready' && (
                            <Button size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              {t('common.download')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-6">{t('admin.dataTransfer.noExportHistory')}</p>
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
