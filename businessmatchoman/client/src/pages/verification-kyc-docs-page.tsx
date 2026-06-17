import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { FileText, ArrowRight, Shield, Info, CheckCircle } from "lucide-react";

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
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const documentTypes = [
  {
    id: "national_id",
    name: "National ID Card",
    description: "Government-issued National ID Card",
    required: true,
    icon: "🆔",
  },
  {
    id: "passport",
    name: "Passport",
    description: "Valid passport with clear photo page",
    required: true,
    icon: "📘",
  },
  {
    id: "driving_license", 
    name: "Driving License",
    description: "Valid driving license with photo",
    required: true,
    icon: "🚗",
  },
  {
    id: "utility_bill",
    name: "Utility Bill",
    description: "Recent utility bill (electricity, water, gas) not older than 3 months",
    required: false,
    icon: "🧾",
  },
  {
    id: "bank_statement",
    name: "Bank Statement", 
    description: "Bank statement not older than 3 months",
    required: false,
    icon: "🏦",
  },
  {
    id: "business_license",
    name: "Business License",
    description: "Valid business registration certificate (for business accounts)",
    required: false,
    icon: "🏢",
  },
];

export default function VerificationKycDocsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Redirect if not logged in or previous steps not completed
  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!user.isEmailVerified) {
    navigate("/verification/email");
    return null;
  }

  if (!user.isPhoneVerified) {
    navigate("/verification/phone");
    return null;
  }

  // Redirect if already has KYC pending/approved
  if (user.kycStatus && user.kycStatus !== "none") {
    navigate("/verification/waiting");
    return null;
  }

  const toggleDocument = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const proceedToUpload = () => {
    if (selectedDocs.length === 0) return;
    
    // Store selected documents in localStorage for next step
    localStorage.setItem("selectedKycDocs", JSON.stringify(selectedDocs));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate("/verification/kyc-upload");
  };

  const hasRequiredDocs = selectedDocs.some(id => 
    documentTypes.find(doc => doc.id === id)?.required
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 py-12 bg-neutral-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="max-w-2xl mx-auto w-full">
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
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                    3
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-primary hidden xs:inline">KYC</span>
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
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Choose Your Documents</CardTitle>
                <CardDescription>
                  Select the documents you'd like to upload for identity verification.
                  You need at least one ID document.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Document Requirements</AlertTitle>
                  <AlertDescription>
                    Please ensure all documents are clear, legible, and not expired. 
                    Accepted formats: JPG, PNG, PDF (max 10MB each).
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Available Documents</h3>
                    <div className="text-sm text-neutral-600">
                      {selectedDocs.length} selected
                    </div>
                  </div>

                  {documentTypes.map((doc) => (
                    <div
                      key={doc.id}
                      className={`
                        border rounded-lg p-4 cursor-pointer transition-all
                        ${selectedDocs.includes(doc.id)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        }
                      `}
                      onClick={() => toggleDocument(doc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{doc.icon}</div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{doc.name}</h4>
                              {doc.required && (
                                <Badge variant="secondary" className="text-xs">
                                  ID Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-neutral-600">{doc.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {selectedDocs.includes(doc.id) && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!hasRequiredDocs && selectedDocs.length > 0 && (
                  <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Please select at least one ID document (National ID, Passport, or Driving License).
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Take photos in good lighting with minimal shadows</li>
                    <li>• Ensure all text and details are clearly visible</li>
                    <li>• Remove any glare or reflections from the document</li>
                    <li>• Upload high-resolution images for faster approval</li>
                  </ul>
                </div>
              </CardContent>

              <div className="px-6 pb-6">
                <Button
                  onClick={proceedToUpload}
                  disabled={!hasRequiredDocs}
                  className="w-full"
                  size="lg"
                >
                  Continue to Upload ({selectedDocs.length} documents)
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                {!hasRequiredDocs && (
                  <p className="text-center text-sm text-neutral-600 mt-2">
                    Please select at least one ID document to continue
                  </p>
                )}
              </div>
            </Card>

            <div className="text-center mt-6">
              <p className="text-sm text-neutral-600">
                Your documents are encrypted and secure. 
                <a href="/privacy" className="text-primary hover:underline ml-1">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}