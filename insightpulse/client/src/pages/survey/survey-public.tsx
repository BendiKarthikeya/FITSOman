import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function SurveyPublic() {
  const [, params] = useRoute("/survey/:id");
  const surveyId = params?.id;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: survey, isLoading, error } = useQuery({
    queryKey: [`/api/public/surveys/${surveyId}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/surveys/${surveyId}`);
      if (!res.ok) throw new Error(`Failed to load survey (${res.status})`);
      return res.json();
    },
    enabled: !!surveyId,
  });

  const questions = Array.isArray((survey as any)?.questions) ? (survey as any).questions : [];

  const handleSliderChange = (value: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleNPSSelect = (score: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: score });
  };

  const handleRatingSelect = (score: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: score });
  };

  const handleTextChange = (text: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: text });
  };

  const handleYesNoSelect = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleMultipleChoiceSelect = (option: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: option });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!surveyId) return;
    
    setIsSubmitting(true);
    try {
      // Submit survey response with AI analysis
      await apiRequest("POST", "/api/survey-responses/analyze", {
        surveyId,
        answers,
        respondentEmail: undefined, // Anonymous response
        respondentPhone: undefined,
      });

      setIsSubmitted(true);
      toast({
        title: "Thank you for your feedback!",
        description: "Your response has been recorded and analyzed.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    } catch (error) {
      
      toast({
        title: "Submission failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Survey Not Found</CardTitle>
            <CardDescription>
              The survey you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
            <p className="text-gray-600 text-center">
              Your feedback has been submitted successfully. We appreciate your time!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>
              This survey doesn't have any questions yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{(survey as any).title}</CardTitle>
          {(survey as any).description && (
            <CardDescription>{(survey as any).description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {question.title}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              {question.description && (
                <p className="text-sm text-gray-600">{question.description}</p>
              )}
            </div>
            
            {question.type === "evi-slider" && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <span className="text-3xl">😞</span>
                  <div className="flex-1 mx-6">
                    <input 
                      type="range" 
                      min={question.minValue ?? 0}
                      max={question.maxValue ?? 100}
                      value={answers[question.id] ?? Math.floor(((question.maxValue ?? 100) + (question.minValue ?? 0)) / 2)}
                      onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                      className="w-full h-3 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-lg appearance-none cursor-pointer slider-thumb" 
                    />
                    <div className="text-center mt-3 text-xl font-bold text-gray-700">
                      {answers[question.id] ?? Math.floor(((question.maxValue ?? 100) + (question.minValue ?? 0)) / 2)}
                    </div>
                  </div>
                  <span className="text-3xl">😊</span>
                </div>
              </div>
            )}

            {question.type === "nps" && (
              <div className="space-y-4">
                <div className="grid grid-cols-11 gap-2">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handleNPSSelect(i)}
                      className={`h-12 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                        answers[question.id] === i 
                          ? 'bg-primary text-white scale-110 shadow-lg' 
                          : i <= 6 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : i <= 8 
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 px-1">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>
            )}

            {question.type === "rating" && (
              <div className="space-y-4">
                <div className="flex gap-3 justify-center">
                  {Array.from({ length: (question.maxValue ?? 5) - (question.minValue ?? 1) + 1 }, (_, i) => {
                    const value = (question.minValue ?? 1) + i;
                    return (
                      <button
                        key={value}
                        onClick={() => handleRatingSelect(value)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                          answers[question.id] === value
                            ? 'bg-primary text-white scale-110 shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {question.type === "yes-no" && (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={answers[question.id] === 'Yes' ? 'default' : 'outline'}
                  className="flex-1 h-14"
                  onClick={() => handleYesNoSelect('Yes')}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={answers[question.id] === 'No' ? 'default' : 'outline'}
                  className="flex-1 h-14"
                  onClick={() => handleYesNoSelect('No')}
                >
                  No
                </Button>
              </div>
            )}

            {(question.type === "text-input" || question.type === "long_text") && (
              <Textarea 
                placeholder="Your answer..."
                value={answers[question.id] || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                className="resize-none min-h-[120px]"
                rows={question.type === "long_text" ? 8 : 5}
              />
            )}

            {question.type === "csat" && (
              <div className="space-y-4">
                <div className="flex gap-4 justify-center">
                  {['😞', '😐', '🙂', '😊', '😍'].map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleRatingSelect(i + 1)}
                      className={`text-3xl hover:scale-110 transition-transform p-2 rounded-lg ${
                        answers[question.id] === i + 1 ? 'bg-slate-100 ring-1 ring-primary' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(question.type === "multiple-choice" || question.type === "multiple_choice") && Array.isArray(question.options) && (
              <div className="space-y-2">
                {question.options.map((option: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleMultipleChoiceSelect(option)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answers[question.id] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {!["evi-slider", "nps", "rating", "yes-no", "text-input", "long_text", "csat", "multiple-choice", "multiple_choice"].includes(question.type) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Question type "{question.type}" is not supported. Please contact support.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              size="lg"
            >
              Previous
            </Button>
            <Button 
              onClick={handleNext}
              disabled={(question.required && !answers[question.id]) || isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : currentQuestion === questions.length - 1 ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
