import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface OtpVerificationProps {
  userId: number;
  userInfo: {
    email: string;
    phone?: string;
    fullName: string;
  };
  otpSent: {
    email: boolean;
    phone: boolean;
  };
  onVerifyOtp: (otpCode: string) => void;
  onGoBack: () => void;
  isLoading: boolean;
  error?: string;
}

export default function OtpVerification({
  userId,
  userInfo,
  otpSent,
  onVerifyOtp,
  onGoBack,
  isLoading,
  error,
}: OtpVerificationProps) {
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length === 6) {
      onVerifyOtp(otpCode);
    }
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split("@");
    const maskedUsername =
      username.slice(0, 2) + "*".repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 4) {
      return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
    }
    return "*".repeat(cleaned.length);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Verify Your Identity</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to your registered contact
          methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {otpSent.email && (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Email sent to:
                </p>
                <p className="text-sm text-blue-700">
                  {maskEmail(userInfo.email)}
                </p>
              </div>
            </div>
          )}

          {otpSent.phone && userInfo.phone && (
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  SMS sent to:
                </p>
                <p className="text-sm text-green-700">
                  {maskPhone(userInfo.phone)}
                </p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Enter 6-digit code</label>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={otpCode.length !== 6 || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onGoBack}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Code expires in 5 minutes. Check your spam folder if you don't see
            the email.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
