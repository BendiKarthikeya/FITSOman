import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { 
  Sparkles,
  CheckCircle,
  Clock,
  Video,
  BookOpen,
  Award,
  Play,
  SkipForward
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: 'welcome' | 'setup' | 'features' | 'learning';
  isCompleted: boolean;
  duration: number; // minutes
  type: 'video' | 'guide' | 'interactive';
}

interface OnboardingChecklist {
  userId: string;
  totalSteps: number;
  completedSteps: number;
  steps: OnboardingStep[];
  startedAt: string;
  completedAt?: string;
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const [selectedStep, setSelectedStep] = useState<OnboardingStep | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch onboarding checklist
  const { data: onboarding, isLoading } = useQuery<OnboardingChecklist>({
    queryKey: ['/api/onboarding/checklist'],
    enabled: !!user?.id,
  });

  // Mark step as complete mutation
  const completeStep = useMutation({
    mutationFn: async (stepId: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/onboarding/steps/${stepId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to mark step complete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/checklist'] });
      toast({ title: 'Step completed! Great job!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Skip step mutation
  const skipStep = useMutation({
    mutationFn: async (stepId: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`/api/onboarding/steps/${stepId}/skip`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to skip step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/checklist'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No onboarding data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = (onboarding.completedSteps / onboarding.totalSteps) * 100;
  const isComplete = onboarding.completedSteps === onboarding.totalSteps;

  const groupedSteps = {
    welcome: onboarding.steps.filter(s => s.category === 'welcome'),
    setup: onboarding.steps.filter(s => s.category === 'setup'),
    features: onboarding.steps.filter(s => s.category === 'features'),
    learning: onboarding.steps.filter(s => s.category === 'learning'),
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'welcome': return Sparkles;
      case 'setup': return Clock;
      case 'features': return BookOpen;
      case 'learning': return Award;
      default: return Sparkles;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'welcome': return 'bg-blue-100 text-blue-800';
      case 'setup': return 'bg-green-100 text-green-800';
      case 'features': return 'bg-purple-100 text-purple-800';
      case 'learning': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'guide': return BookOpen;
      case 'interactive': return Sparkles;
      default: return Sparkles;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Welcome to InsightPulse!</h1>
          <p className="text-lg text-muted-foreground">Get started with these essential steps</p>
        </div>

        {/* Progress Card */}
        <Card className="bg-white border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Progress</CardTitle>
                <CardDescription>Complete all steps to unlock full platform access</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{Math.round(progress)}%</div>
                <p className="text-sm text-muted-foreground">{onboarding.completedSteps}/{onboarding.totalSteps} completed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-3" />
            {isComplete && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <p className="font-medium">🎉 Onboarding complete! You're all set!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Steps by Category */}
        <div className="space-y-6">
          {(Object.entries(groupedSteps) as [string, OnboardingStep[]][]).map(([category, steps]) => {
            if (steps.length === 0) return null;

            const Icon = getCategoryIcon(category);
            const completedInCategory = steps.filter(s => s.isCompleted).length;

            return (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-muted-foreground" />
                  <h2 className="text-xl font-semibold capitalize">
                    {category === 'features' ? 'Explore Features' : category}
                  </h2>
                  <Badge variant="outline">
                    {completedInCategory}/{steps.length}
                  </Badge>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  {steps.map((step) => {
                    const StepIcon = getTypeIcon(step.type);
                    return (
                      <Card 
                        key={step.id}
                        className={`cursor-pointer transition-all ${
                          step.isCompleted ? 'opacity-60 bg-muted' : 'hover:border-primary'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              {/* Checkbox */}
                              <div className="pt-1">
                                <Checkbox
                                  checked={step.isCompleted}
                                  onChange={() => {
                                    if (!step.isCompleted) {
                                      completeStep.mutate(step.id);
                                    }
                                  }}
                                  disabled={step.isCompleted}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className={`font-semibold ${step.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {step.title}
                                  </h3>
                                  <Badge className={getCategoryColor(step.category)}>
                                    {step.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {step.duration} min • <StepIcon className="inline w-3 h-3" /> {step.type}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            {!step.isCompleted && (
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStep(step);
                                    if (step.type === 'video') {
                                      setShowVideoModal(true);
                                    }
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Start
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => skipStep.mutate(step.id)}
                                >
                                  <SkipForward className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {step.isCompleted && (
                              <CheckCircle className="w-5 h-5 text-green-500 ml-4" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips Card */}
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900">💡 Pro Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            <p>• You can skip any step and come back to it later</p>
            <p>• Videos are all under 5 minutes for quick learning</p>
            <p>• Complete all steps to unlock advanced features</p>
            <p>• Need help? Check our FAQ or contact support</p>
          </CardContent>
        </Card>
      </div>

      {/* Video Modal */}
      {selectedStep && (
        <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedStep.title}</DialogTitle>
              <DialogDescription>{selectedStep.description}</DialogDescription>
            </DialogHeader>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Video Placeholder</p>
                <p className="text-sm text-gray-400 mt-2">{selectedStep.duration} minutes</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowVideoModal(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  completeStep.mutate(selectedStep.id);
                  setShowVideoModal(false);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
