import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Phone, CheckCircle, RefreshCw, ArrowRight, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

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

const phoneSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
});

const verificationSchema = z.object({
  verificationCode: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function VerificationPhonePage() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: user?.phone || "",
    },
  });

  const verificationForm = useForm<VerificationFormValues>({
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

  // Send phone verification mutation
  const sendPhoneMutation = useMutation({
    mutationFn: async (data: PhoneFormValues) => {
      const res = await apiRequest("POST", "/api/verification/send-phone", data);
      return res.json();
    },
    onSuccess: () => {
      setStep("verify");
      setCooldown(60);
      toast({
        title: t('alerts.verification.phoneCodeSent'),
        description: t('alerts.verification.phoneCodeSentDesc'),
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

  // Verify phone mutation
  const verifyPhoneMutation = useMutation({
    mutationFn: async (data: VerificationFormValues) => {
      const res = await apiRequest("POST", "/api/verification/verify-phone", data);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: t('alerts.verification.phoneVerified'),
        description: t('alerts.verification.phoneVerifiedDesc'),
      });
      
      // Refetch user data to update the verification status
      await refetch();
      
      // Small delay to ensure user data is updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        navigate("/verification/kyc-docs");
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

  const onPhoneSubmit = (data: PhoneFormValues) => {
    setPhoneNumber(data.phone);
    sendPhoneMutation.mutate(data);
  };

  const onVerifySubmit = (data: VerificationFormValues) => {
    verifyPhoneMutation.mutate(data);
  };

  const handleResendCode = () => {
    sendPhoneMutation.mutate({ phone: phoneNumber });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 py-12 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="max-w-sm mx-auto w-full">
            {/* Progress Indicator */}
            <div className="mb-8 overflow-x-hidden">
              <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4 min-w-0">
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    ✓
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-green-600 hidden xs:inline">Email</span>
                </div>
                <div className="w-4 sm:w-8 h-px bg-green-500 flex-shrink-0"></div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    2
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-primary hidden xs:inline">Phone</span>
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
            </div>

            <Card className="shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Verify Your Phone</CardTitle>
                <CardDescription>
                  {step === "phone" 
                    ? "Enter your phone number to receive a verification code."
                    : "Enter the 6-digit code sent to your phone."
                  }
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {step === "phone" ? (
                  <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                      <FormField
                        control={phoneForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <PhoneInput
                                {...field}
                                defaultCountry="OM"
                                placeholder="Enter your phone number"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={sendPhoneMutation.isPending || !phoneForm.watch("phone")}
                        className="w-full"
                        size="lg"
                      >
                        {sendPhoneMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Sending Code...
                          </>
                        ) : (
                          <>
                            Send Verification Code
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-6">
                    <Alert>
                      <Phone className="h-4 w-4" />
                      <AlertDescription>
                        Verification code sent to: <strong>{phoneNumber}</strong>
                      </AlertDescription>
                    </Alert>

                    <Form {...verificationForm}>
                      <form onSubmit={verificationForm.handleSubmit(onVerifySubmit)} className="space-y-4">
                        <FormField
                          control={verificationForm.control}
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
                          disabled={verifyPhoneMutation.isPending || !verificationForm.watch("verificationCode")}
                          className="w-full"
                          size="lg"
                        >
                          {verifyPhoneMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Phone
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>

                    <div className="flex flex-col space-y-3">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-neutral-600">Didn't receive the code?</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResendCode}
                          disabled={cooldown > 0 || sendPhoneMutation.isPending}
                        >
                          {cooldown > 0 ? (
                            `Resend in ${cooldown}s`
                          ) : (
                            "Resend Code"
                          )}
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setStep("phone")}
                        className="w-full"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Change Phone Number
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