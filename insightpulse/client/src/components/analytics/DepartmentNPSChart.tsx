                import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface DepartmentNPS {
  id: string;
  departmentId: string;
  departmentName: string;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
}

interface DepartmentNPSData {
  overallNps: number;
  departments: DepartmentNPS[];
  month: number;
  year: number;
  totalResponses: number;
}

export const DepartmentNPSChart = () => {
  const { t } = useTranslation();
  
  const { data, isLoading, error } = useQuery<DepartmentNPSData>({
    queryKey: ['department-nps'],
    queryFn: async () => {
      const response = await fetch('/api/department-nps', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'test'}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch department NPS');
      return response.json();
    }
  });

  const getNpsColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-blue-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getNpcColorLight = (score: number): string => {
    if (score >= 70) return 'bg-green-50';
    if (score >= 50) return 'bg-blue-50';
    if (score >= 30) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  if (isLoading) {
    return (
      <Card className="dashboard-card shadow-lg">
        <CardHeader>
          <CardTitle>Overall NPS - Department wise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-gray-600">Loading department NPS data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dashboard-card shadow-lg">
        <CardHeader>
          <CardTitle>Overall NPS - Department wise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Error loading department NPS data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="dashboard-card shadow-lg col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Overall NPS</div>
            <div className="text-sm text-gray-500 font-normal mt-1">Showing nps score based on the department</div>
          </div>
          <div className={`text-4xl font-bold rounded-lg px-6 py-3 ${getNpcColorLight(data.overallNps)}`}>
            {data.overallNps.toFixed(0)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.departments && data.departments.map((dept) => {
            const maxScore = 100;
            const barWidth = (dept.npsScore / maxScore) * 100;
            
            return (
              <div key={dept.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 min-w-[140px]">{dept.departmentName}</span>
                  <div className="flex-1 mx-4 bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${getNpsColor(dept.npsScore)} transition-all duration-300`}
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 min-w-[50px] text-right">{dept.npsScore}</span>
                </div>
                <div className="text-xs text-gray-500 ml-36 flex gap-6">
                  <span>Promoters: {dept.promoters}</span>
                  <span>Passives: {dept.passives}</span>
                  <span>Detractors: {dept.detractors}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t text-xs text-gray-500">
          <span>Total Responses: {data.totalResponses}</span>
        </div>
      </CardContent>
    </Card>
  );
};
