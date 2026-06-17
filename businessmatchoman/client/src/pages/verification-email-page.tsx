import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Mail, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const verificationSchema = z.object({
  verificationCode: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function VerificationEmailPage() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  // Cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Send verification email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verification/send-email", {});
      return res.json();
    },
    onSuccess: () => {
      setIsCodeSent(true);
      setCooldown(60);
      toast({
        title: t('alerts.verification.codeSent'),
        description: t('alerts.verification.codeSentDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('alerts.verification.failedToSendCode'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (data: VerificationFormValues) => {
      const res = await apiRequest("POST", "/api/verification/verify-email", data);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: t('alerts.verification.emailVerified'),
        description: t('alerts.verification.emailVerifiedDesc'),
      });
      
      // Refetch user data to update the verification status
      await refetch();
      
      // Navigate to next step immediately
      setTimeout(() => {
        navigate("/verification/phone");
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: t('alerts.verification.verificationFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerificationFormValues) => {
    verifyEmailMutation.mutate(data);
  };

  const handleSendCode = () => {
    sendEmailMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 py-12 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="max-w-lg mx-auto w-full">
            {/* Progress Indicator */}
            <div className="mb-8 overflow-x-hidden">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Verification</h1>
                <p className="text-sm text-gray-600">Complete these steps to secure your TEEJARTI account and access all features</p>
              </div>
              
              <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6 min-w-0">
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    1
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-primary hidden xs:inline">Email</span>
                </div>
                <div className="w-4 sm:w-8 h-px bg-neutral-300 flex-shrink-0"></div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    2
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-neutral-600 hidden xs:inline">Phone</span>
                </div>
                <div className="w-4 sm:w-8 h-px bg-neutral-300 flex-shrink-0"></div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    3
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-neutral-600 hidden xs:inline">KYC</span>
                </div>
                <div className="w-4 sm:w-8 h-px bg-neutral-300 flex-shrink-0"></div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    4
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-neutral-600 hidden xs:inline">Done</span>
                </div>
              </div>

              {/* Step Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="font-medium text-primary text-sm mb-1">Email Verification</div>
                  <div className="text-xs text-gray-600">Confirm your email address with a verification code</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-600 text-sm mb-1">Phone Verification</div>
                  <div className="text-xs text-gray-500">Verify your phone number via SMS</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-600 text-sm mb-1">Identity Documents</div>
                  <div className="text-xs text-gray-500">Upload ID and proof documents</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-600 text-sm mb-1">Account Ready</div>
                  <div className="text-xs text-gray-500">Full access to all features</div>
                </div>
              </div>
            </div>

            <Card className="shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>
                  We need to verify your email address to secure your account.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Verification code will be sent to: <strong>{user?.email}</strong>
                  </AlertDescription>
                </Alert>

                {!isCodeSent ? (
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-600 text-center">
                      Click the button below to receive a 6-digit verification code in your email.
                    </p>
                    
                    <Button 
                      onClick={handleSendCode}
                      disabled={sendEmailMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {sendEmailMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending Code...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Verification Code
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-700">
                        Verification code sent! Check your email inbox.
                      </p>
                    </div>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="verificationCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification Code</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter 6-digit code"
                                  className="text-center text-lg tracking-widest"
                                  maxLength={6}
                                  autoComplete="one-time-code"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={verifyEmailMutation.isPending || !form.watch("verificationCode")}
                          className="w-full"
                          size="lg"
                        >
                          {verifyEmailMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Email
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>

                    <div className="text-center space-y-2">
                      <p className="text-sm text-neutral-600">Didn't receive the code?</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSendCode}
                        disabled={cooldown > 0 || sendEmailMutation.isPending}
                      >
                        {cooldown > 0 ? (
                          `Resend in ${cooldown}s`
                        ) : (
                          "Resend Code"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <p className="text-sm text-neutral-600">
                Need help? <a href="mailto:support@teejarti.com" className="text-primary hover:underline">Contact Support</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}