import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SurveyModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const { toast } = useToast();

  // Show modal after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const questions = [
    {
      id: "evi",
      type: "evi-slider",
      title: "How did our website make you feel?",
      required: true
    },
    {
      id: "nps",
      type: "nps",
      title: "How likely are you to recommend us to a friend?",
      required: true
    },
    {
      id: "feedback",
      type: "text",
      title: "Any additional comments?",
      required: false
    }
  ];

  const handleSliderChange = (value: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleNPSSelect = (score: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: score });
  };

  const handleTextChange = (text: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: text });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      // First get the available survey ID dynamically
      let availableSurvey = null;
      
      try {
        const surveysResponse = await apiRequest("GET", "/api/surveys");
        const surveysData = await surveysResponse.json();
        availableSurvey = surveysData.find((s: any) => s.isActive) || surveysData[0];
      } catch (surveyError) {
        
      }
      
      // If no surveys available, create a default one
      if (!availableSurvey) {
        try {
          const createResponse = await apiRequest("POST", "/api/surveys", {
            title: "Quick Feedback Survey",
            description: "Share your thoughts and help us improve",
            questions: [
              {
                id: "evi",
                type: "evi-slider",
                title: "How did our website make you feel?",
                required: true,
                minValue: 0,
                maxValue: 100
              },
              {
                id: "nps",
                type: "nps",
                title: "How likely are you to recommend us to a friend?",
                required: true,
                minValue: 0,
                maxValue: 10
              },
              {
                id: "feedback",
                type: "text",
                title: "Any additional comments?",
                required: false
              }
            ],
            isActive: true
          });
          availableSurvey = await createResponse.json();
        } catch (createError) {
          throw new Error("Unable to create or access surveys. Please try again later.");
        }
      }

      

      await apiRequest("POST", "/api/responses", {
        surveyId: availableSurvey.id, // Use dynamic survey ID
        respondentEmail: "quickfeedback@guest.com",
        answers,
        eviScore: answers.evi || 50,
        npsScore: answers.nps || 5,
        csatScore: Math.floor((answers.evi || 50) / 20) + 1, // Convert EVI to CSAT scale
      });

      toast({
        title: "Thank you for your feedback!",
        description: "Your response has been recorded.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setIsVisible(false);
    } catch (error) {
      
      toast({
        title: "Submission failed",
        description: `Please try again later. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 survey-modal-backdrop z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md transform transition-all duration-300 scale-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Quick Feedback</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Question */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{question.title}</h3>
            
            {question.type === "evi-slider" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                  <span className="text-2xl">😞</span>
                  <div className="flex-1 mx-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={answers[question.id] || 50}
                      onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                      className="w-full h-2 evi-slider rounded-lg appearance-none cursor-pointer" 
                    />
                    <div className="text-center mt-2 text-sm font-semibold text-gray-700">
                      {answers[question.id] || 50}
                    </div>
                  </div>
                  <span className="text-2xl">😊</span>
                </div>
              </div>
            )}

            {question.type === "nps" && (
              <div className="space-y-4">
                <div className="grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handleNPSSelect(i)}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium nps-button transition-all ${
                        answers[question.id] === i 
                          ? 'bg-primary text-white scale-110' 
                          : i <= 6 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : i <= 8 
                              ? 'bg-yellow-400 text-white hover:bg-yellow-500' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>
            )}

            {question.type === "text" && (
              <Textarea 
                placeholder="Share your thoughts..."
                value={answers[question.id] || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                className="resize-none"
                rows={4}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <Button 
              onClick={handleNext}
              disabled={question.required && !answers[question.id]}
              variant="secondary"
            >
              {currentQuestion === questions.length - 1 ? (
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
