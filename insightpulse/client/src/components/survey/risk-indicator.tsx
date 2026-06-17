import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Zap, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface RiskIndicator {
  category: string;
  severity: string;
  trigger: string;
  confidence: number;
  description: string;
}

interface RiskAnalysisProps {
  riskLevel: string;
  riskScore: number;
  indicators: RiskIndicator[];
  recommendations: string[];
  requiresManualReview: boolean;
  respondentEmail?: string;
}

export function RiskIndicatorBadge({ riskLevel, riskScore }: { riskLevel: string; riskScore: number }) {
  const configs = {
    critical: {
      color: 'bg-red-100 text-red-900',
      icon: AlertTriangle,
      label: '🔴 CRITICAL'
    },
    high: {
      color: 'bg-orange-100 text-orange-900',
      icon: AlertCircle,
      label: '🟠 HIGH'
    },
    medium: {
      color: 'bg-yellow-100 text-yellow-900',
      icon: Zap,
      label: '🟡 MEDIUM'
    },
    low: {
      color: 'bg-blue-100 text-blue-900',
      icon: AlertCircle,
      label: '🔵 LOW'
    },
    none: {
      color: 'bg-gray-100 text-gray-900',
      icon: null,
      label: '✓ CLEAR'
    }
  };

  const config = configs[riskLevel as keyof typeof configs] || configs.none;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {Icon && <Icon className="w-4 h-4" />}
      <span>{config.label}</span>
      <span className="text-xs opacity-75">({riskScore}/100)</span>
    </div>
  );
}

export function RiskAnalysisCard({ 
  riskLevel, 
  riskScore, 
  indicators, 
  recommendations, 
  requiresManualReview,
  respondentEmail
}: RiskAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(requiresManualReview);

  if (riskLevel === 'none' || !indicators || indicators.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>✓</span>
            No Risk Indicators Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">
            This response does not contain high-risk indicators.
          </p>
        </CardContent>
      </Card>
    );
  }

  const severityColors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
    critical: 'destructive',
    high: 'secondary',
    medium: 'outline',
    low: 'secondary'
  };

  const categoriesCount = new Set(indicators.map(i => i.category)).size;

  return (
    <Card className={`border-2 ${
      riskLevel === 'critical' ? 'border-red-300 bg-red-50' :
      riskLevel === 'high' ? 'border-orange-300 bg-orange-50' :
      riskLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' :
      'border-blue-300 bg-blue-50'
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base mb-2">
              ⚠️ Risk Indicators Detected
            </CardTitle>
            <CardDescription>
              {indicators.length} risk indicator{indicators.length !== 1 ? 's' : ''} found across {categoriesCount} categor{categoriesCount !== 1 ? 'ies' : 'y'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0"
          >
            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <RiskIndicatorBadge riskLevel={riskLevel} riskScore={riskScore} />
          {requiresManualReview && (
            <Badge variant="destructive" className="animate-pulse">Manual Review Required</Badge>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Risk Indicators */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Detected Indicators:</h4>
            <div className="space-y-2">
              {indicators.map((indicator, idx) => (
                <div key={idx} className="p-3 bg-white rounded-md border space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize">
                        {indicator.category.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-600">
                        Trigger: <code className="bg-gray-100 px-1 rounded">{indicator.trigger}</code>
                      </p>
                      <p className="text-xs text-gray-700 mt-1">{indicator.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={severityColors[indicator.severity as keyof typeof severityColors] || 'secondary'}
                        className="capitalize"
                      >
                        {indicator.severity}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {(indicator.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-sm">Recommended Actions:</h4>
              <ul className="space-y-1">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-xs mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Respondent Info */}
          {respondentEmail && (
            <div className="border-t pt-4">
              <div className="p-2 bg-gray-100 rounded text-xs">
                <p className="text-gray-600">
                  <strong>Respondent:</strong> {respondentEmail}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Inline risk indicator for summary views
 */
export function RiskIndicatorSummary({ 
  riskLevel, 
  riskScore,
  indicatorCount 
}: { 
  riskLevel: string; 
  riskScore: number;
  indicatorCount: number;
}) {
  if (riskLevel === 'none') return null;

  const icons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    none: '✓'
  };

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium bg-gray-100">
      <span>{icons[riskLevel as keyof typeof icons] || '?'}</span>
      <span>{riskLevel.toUpperCase()}</span>
      <span className="text-opacity-75">({indicatorCount} indicator{indicatorCount !== 1 ? 's' : ''})</span>
    </div>
  );
}

/**
 * Risk summary for dashboard/list views
 */
export function RiskSummaryRow({ 
  respondent, 
  riskLevel, 
  riskScore,
  indicators,
  onClick
}: { 
  respondent: string;
  riskLevel: string;
  riskScore: number;
  indicators: RiskIndicator[];
  onClick?: () => void;
}) {
  if (riskLevel === 'none' && indicators.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left rounded-md border transition-colors ${
        riskLevel === 'critical' ? 'bg-red-50 border-red-300 hover:bg-red-100' :
        riskLevel === 'high' ? 'bg-orange-50 border-orange-300 hover:bg-orange-100' :
        riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100' :
        'bg-blue-50 border-blue-300 hover:bg-blue-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm">{respondent}</p>
          <p className="text-xs text-gray-600 mt-1">
            {indicators.length} risk indicator{indicators.length !== 1 ? 's' : ''} detected
          </p>
        </div>
        <RiskIndicatorBadge riskLevel={riskLevel} riskScore={riskScore} />
      </div>
    </button>
  );
}
