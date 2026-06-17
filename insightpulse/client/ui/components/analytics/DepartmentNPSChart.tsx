import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { TrendingUp } from 'lucide-react';

export const DepartmentNPSChart: React.FC = () => {
  const { data: npsData, isLoading, error } = useQuery({
    queryKey: ['/api/department-nps'],
    queryFn: getQueryFn({ on401: 'throw' }) as any,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !npsData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Unable to load NPS data</p>
      </div>
    );
  }

  const { overallNps, departments } = npsData as { overallNps: number; departments: any[] };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Overall NPS</h3>
        <p className="text-sm text-gray-500">Showing nps score based on the department</p>
      </div>

      {/* Overall NPS Score */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Overall NPS Score</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold text-green-600">{overallNps}</span>
              <span className="text-sm text-gray-500">({overallNps >= 70 ? 'Excellent' : overallNps >= 50 ? 'Good' : overallNps >= 0 ? 'Average' : 'Poor'})</span>
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>

      {/* Department Bars */}
      <div className="space-y-4">
        {departments?.map((dept: any, index: number) => {
          const score = parseFloat(dept.npsScore) || 0;
          const normalizedScore = Math.max(0, Math.min(100, (score + 100) / 2)); // Convert -100-100 to 0-100
          
          const getScoreColor = (score: number) => {
            if (score >= 70) return 'bg-green-500';
            if (score >= 50) return 'bg-blue-500';
            if (score >= 30) return 'bg-yellow-500';
            return 'bg-red-500';
          };

          return (
            <div key={dept.id || index}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 truncate">
                  {dept.departmentName || 'Unknown'}
                </label>
                <span className="text-sm font-semibold text-gray-900 ml-2">
                  {score}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${getScoreColor(score)}`}
                  style={{ width: `${normalizedScore}%` }}
                ></div>
              </div>
              {dept.totalResponses && (
                <p className="text-xs text-gray-500 mt-1">
                  {dept.totalResponses} response{dept.totalResponses !== 1 ? 's' : ''} • 
                  Promoters: {dept.promoters}, Passives: {dept.passives}, Detractors: {dept.detractors}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
