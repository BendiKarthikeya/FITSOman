import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VoiceSurveyDialerProps {
  surveyId: string;
  surveyTitle: string;
}

export default function VoiceSurveyDialer({ surveyId, surveyTitle }: VoiceSurveyDialerProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const handleStartCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to call",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setCallStatus("calling");
    setErrorMessage("");

    try {
      const response = await apiRequest("POST", "/api/start-survey", {
        phoneNumber: phoneNumber,
        surveyId: surveyId
      });

      const result = await response.json();

      if (result.success) {
        setCallStatus("success");
        toast({
          title: "Call initiated!",
          description: `Voice survey call started to ${phoneNumber}`,
        });
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setPhoneNumber("");
          setCallStatus("idle");
        }, 3000);
      } else {
        throw new Error(result.message || "Failed to start call");
      }
    } catch (error: any) {
      setCallStatus("error");
      setErrorMessage("We couldn't start the call. Please try again.");
      toast({
        title: "Call failed",
        description: "We couldn't start the voice survey call. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Add + prefix if not present and number starts
    if (cleaned.length > 0 && !value.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Voice Survey
        </CardTitle>
        <CardDescription>
          Start a voice call to conduct this survey: <strong>{surveyTitle}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStartCall} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={handlePhoneChange}
              disabled={isLoading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter phone number in E.164 format (e.g., +1234567890)
            </p>
          </div>

          {callStatus === "error" && errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {callStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Call initiated successfully! The recipient will receive a call shortly.</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initiating Call...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Start Voice Survey Call
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Enter the recipient's phone number</li>
              <li>Click to initiate the call</li>
              <li>Our AI agent will call and ask survey questions</li>
              <li>Responses are automatically recorded in the database</li>
            </ol>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
