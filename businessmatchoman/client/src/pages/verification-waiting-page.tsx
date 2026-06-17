import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Clock, CheckCircle, Mail, Phone, Shield, ArrowRight, MessageSquare, Bell } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function VerificationWaitingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Redirect if verification not complete
  if (!user.isEmailVerified || !user.isPhoneVerified) {
    navigate("/verification/email");
    return null;
  }

  // Redirect if already verified
  if (user.kycStatus === "approved") {
    navigate("/dashboard");
    return null;
  }

  const verificationSteps = [
    {
      icon: Mail,
      title: "Email Verification",
      status: "completed",
      description: "Email verified successfully",
    },
    {
      icon: Phone,
      title: "Phone Verification", 
      status: "completed",
      description: "Phone number verified successfully",
    },
    {
      icon: Shield,
      title: "Document Verification",
      status: user.kycStatus === "pending" ? "pending" : "submitted",
      description: user.kycStatus === "pending" 
        ? "Under review by our verification team"
        : "Documents submitted for review",
    },
  ];

  const availableFeatures = [
    "Browse business listings and investment opportunities",
    "View detailed business profiles and contact information", 
    "Save listings to your favorites for later review",
    "Update your profile and preferences",
    "Access educational resources and market insights",
  ];

  const restrictedFeatures = [
    "Create new business listings",
    "Contact business owners directly", 
    "Access premium investment opportunities",
    "Participate in bidding and negotiations",
    "Use advanced search and filtering options",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 py-12 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="max-w-4xl mx-auto w-full">
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
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    ✓
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-green-600 hidden xs:inline">Phone</span>
                </div>
                <div className="w-4 sm:w-8 h-px bg-green-500 flex-shrink-0"></div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    ✓
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-green-600 hidden xs:inline">KYC</span>
                </div>
                <div className="w-4 sm:w-8 h-px bg-orange-500 flex-shrink-0"></div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-orange-600 hidden xs:inline">Pending</span>
                </div>
              </div>
            </div>

            {/* Main Success Card */}
            <Card className="shadow-lg mb-8">
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <CardTitle className="text-3xl text-green-700">Verification Submitted Successfully! 🎉</CardTitle>
                <CardDescription className="text-lg">
                  Thank you for completing your account verification. We're reviewing your documents.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Timeline Alert */}
                <Alert className="border-orange-200 bg-orange-50">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <AlertTitle className="text-orange-800">Review Timeline</AlertTitle>
                  <AlertDescription className="text-orange-700">
                    <strong>Expected review time: 24-48 hours</strong>
                    <br />
                    You'll receive an email notification once your verification is complete.
                  </AlertDescription>
                </Alert>

                {/* Verification Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Verification Progress</h3>
                  
                  {verificationSteps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 rounded-lg bg-neutral-50">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${step.status === "completed" 
                          ? "bg-green-100 text-green-600" 
                          : step.status === "pending"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-blue-100 text-blue-600"
                        }
                      `}>
                        {step.status === "completed" ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : step.status === "pending" ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{step.title}</h4>
                          <Badge variant={
                            step.status === "completed" ? "default" : 
                            step.status === "pending" ? "secondary" : "outline"
                          } className={
                            step.status === "completed" ? "bg-green-100 text-green-700" : 
                            step.status === "pending" ? "bg-orange-100 text-orange-700" : ""
                          }>
                            {step.status === "completed" ? "Completed" : 
                             step.status === "pending" ? "Under Review" : "Submitted"}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-600">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* What's Next */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    What happens next?
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Our verification team will review your submitted documents within 24-48 hours
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      You'll receive an email notification with the verification results
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      If approved, you'll gain full access to all platform features
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      If additional information is needed, we'll guide you through the process
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Available Features */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Available Now
                  </CardTitle>
                  <CardDescription>
                    You can use these features while waiting for verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {availableFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Separator className="my-4" />
                  
                  <Button onClick={() => navigate("/listings")} className="w-full">
                    Browse Listings
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Coming Soon
                  </CardTitle>
                  <CardDescription>
                    These features will unlock after verification approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {restrictedFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Clock className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Separator className="my-4" />
                  
                  <Button variant="outline" disabled className="w-full">
                    <Clock className="w-4 h-4 mr-2" />
                    Awaiting Verification
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Support Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Need Help?
                </CardTitle>
                <CardDescription>
                  Our support team is here to assist you during the verification process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Mail className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Email Support</h4>
                    <p className="text-sm text-neutral-600 mb-2">Get help via email</p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="mailto:support@teejarti.com">Contact Support</a>
                    </Button>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <MessageSquare className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Live Chat</h4>
                    <p className="text-sm text-neutral-600 mb-2">Chat with our team</p>
                    <Button variant="outline" size="sm">
                      Start Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}