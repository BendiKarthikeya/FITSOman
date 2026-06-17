import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Upload, FileText, ArrowRight, ArrowLeft, X, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getAuthToken } from "@/lib/authUtils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const kycFormSchema = z.object({
  idType: z.string({ required_error: "Please select an ID type" }),
  idNumber: z.string().min(3, "ID number must be at least 3 characters"),
  country: z.string({ required_error: "Please select your country" }),
  dateOfBirth: z.string({ required_error: "Please enter your date of birth" }),
});

type KycFormValues = z.infer<typeof kycFormSchema>;

const documentTypes = [
  { id: "national_id", name: "National ID Card", icon: "🆔" },
  { id: "passport", name: "Passport", icon: "📘" },
  { id: "driving_license", name: "Driving License", icon: "🚗" },
  { id: "utility_bill", name: "Utility Bill", icon: "🧾" },
  { id: "bank_statement", name: "Bank Statement", icon: "🏦" },
  { id: "business_license", name: "Business License", icon: "🏢" },
];

const countries = [
  "Oman", "United Arab Emirates", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain",
  "Yemen", "Jordan", "Lebanon", "Syria", "Iraq", "Egypt", "Other"
];

export default function VerificationKycUploadPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Redirect checks
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

  // Get selected documents from previous step
  useEffect(() => {
    const saved = localStorage.getItem("selectedKycDocs");
    if (saved) {
      setSelectedDocs(JSON.parse(saved));
    } else {
      navigate("/verification/kyc-docs");
    }
  }, [navigate]);

  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      idType: "",
      idNumber: "",
      country: "Oman",
      dateOfBirth: "",
    },
  });

  // File upload function
  const uploadFile = async (docType: string, file: File) => {
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (file.size > maxSize) {
      toast({
        title: t('alerts.upload.fileTooLarge'),
        description: t('alerts.upload.fileSizeLimit'),
        variant: "destructive",
      });
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('alerts.upload.invalidFileType'),
        description: t('alerts.upload.invalidFileTypeDesc'),
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", docType);

    try {
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      
      const xhr = new XMLHttpRequest();
      
      return new Promise<string>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [docType]: progress }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setUploadedFiles(prev => ({ ...prev, [docType]: response.url }));
            setUploadProgress(prev => ({ ...prev, [docType]: 100 }));
            resolve(response.url);
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", "/api/upload/kyc-document");
        
        // Add authorization header
        const token = getAuthToken();
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        
        xhr.send(formData);
      });
    } catch (error) {
      toast({
        title: t('alerts.upload.uploadFailed'),
        description: t('alerts.upload.uploadFailedDesc'),
        variant: "destructive",
      });
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
    }
  };

  const removeFile = (docType: string) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[docType];
      return newFiles;
    });
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[docType];
      return newProgress;
    });
  };

  // Submit KYC mutation
  const submitKycMutation = useMutation({
    mutationFn: async (values: KycFormValues) => {
      const payload = {
        ...values,
        documents: uploadedFiles,
        selectedDocuments: selectedDocs,
      };
      
      const res = await apiRequest("POST", "/api/verification/submit-kyc", payload);
      return res.json();
    },
    onSuccess: () => {
      localStorage.removeItem("selectedKycDocs");
      toast({
        title: t('alerts.verification.kycSubmitted'),
        description: t('alerts.verification.kycSubmittedDesc'),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate("/verification/waiting");
    },
    onError: (error: Error) => {
      toast({
        title: t('alerts.verification.submissionFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: KycFormValues) => {
    const requiredUploads = selectedDocs.filter(docId => 
      ["national_id", "passport", "driving_license"].includes(docId)
    );
    
    const hasRequiredDocuments = requiredUploads.some(docId => uploadedFiles[docId]);
    
    if (!hasRequiredDocuments) {
      toast({
        title: t('alerts.verification.missingDocuments'),
        description: t('alerts.verification.missingDocumentsDesc'),
        variant: "destructive",
      });
      return;
    }

    submitKycMutation.mutate(values);
  };

  const getDocumentInfo = (docId: string) => {
    return documentTypes.find(doc => doc.id === docId);
  };

  const allRequiredUploaded = selectedDocs.filter(docId => 
    ["national_id", "passport", "driving_license"].includes(docId)
  ).some(docId => uploadedFiles[docId]);

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
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Upload Your Documents</CardTitle>
                <CardDescription>
                  Upload the documents you selected and complete your information.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Document Uploads */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Document Uploads</h3>
                  
                  {selectedDocs.map((docId) => {
                    const docInfo = getDocumentInfo(docId);
                    if (!docInfo) return null;
                    
                    const isUploaded = uploadedFiles[docId];
                    const progress = uploadProgress[docId];
                    
                    return (
                      <div key={docId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{docInfo.icon}</span>
                            <div>
                              <h4 className="font-medium">{docInfo.name}</h4>
                              <p className="text-sm text-neutral-600">
                                {["national_id", "passport", "driving_license"].includes(docId) ? "Required" : "Optional"}
                              </p>
                            </div>
                          </div>
                          
                          {isUploaded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(docId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        {isUploaded ? (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Document uploaded successfully</span>
                          </div>
                        ) : progress !== undefined && progress > 0 && progress < 100 ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                              <span className="text-sm text-blue-600">Uploading... {progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadFile(docId, file);
                              }}
                              className="hidden"
                              id={`file-${docId}`}
                            />
                            <label
                              htmlFor={`file-${docId}`}
                              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5"
                            >
                              <div className="text-center">
                                <Upload className="w-6 h-6 mx-auto text-neutral-400 mb-2" />
                                <span className="text-sm text-neutral-600">
                                  Click to upload {docInfo.name}
                                </span>
                                <p className="text-xs text-neutral-500 mt-1">
                                  JPG, PNG, PDF (max 10MB)
                                </p>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!allRequiredUploaded && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please upload at least one ID document (National ID, Passport, or Driving License) to continue.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Personal Information Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="idType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary ID Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select ID type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="national_id">National ID Card</SelectItem>
                                  <SelectItem value="passport">Passport</SelectItem>
                                  <SelectItem value="driving_license">Driving License</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="idNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter your ID number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {countries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex space-x-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            navigate("/verification/kyc-docs");
                          }}
                          className="flex-1"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Documents
                        </Button>

                        <Button
                          type="submit"
                          disabled={!allRequiredUploaded || submitKycMutation.isPending}
                          className="flex-1"
                        >
                          {submitKycMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              Submit for Review
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <p className="text-sm text-neutral-600">
                Your documents are encrypted and secure. Review typically takes 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}