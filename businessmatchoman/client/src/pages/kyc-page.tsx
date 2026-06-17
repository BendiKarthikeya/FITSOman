import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Kyc } from "@shared/schema";
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Validation schema for KYC submission
const kycFormSchema = z.object({
  idType: z.string({
    required_error: "Please select an ID type",
  }),
  idNumber: z.string().min(3, {
    message: "ID number must be at least 3 characters",
  }),
  idDocumentUrl: z.string().min(5, {
    message: "Document URL is required",
  }),
  addressProofUrl: z.string().optional(),
  businessLicenseUrl: z.string().optional(),
});

type KycFormValues = z.infer<typeof kycFormSchema>;

export default function KycPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "form">("upload");

  // Simulated file upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    idDocument?: string;
    addressProof?: string;
    businessLicense?: string;
  }>({});
  
  const [uploadPreviews, setUploadPreviews] = useState<{
    idDocument?: { file: File; preview: string };
    addressProof?: { file: File; preview: string };
    businessLicense?: { file: File; preview: string };
  }>({});
  
  const [validationErrors, setValidationErrors] = useState<{
    idDocument?: string;
    addressProof?: string;
    businessLicense?: string;
  }>({});

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Get current KYC status
  const { data: kycData, isLoading: isLoadingKyc } = useQuery<Kyc>({
    queryKey: ["/api/kyc/status"],
    retry: false,
    throwOnError: false,
  });

  // Initialize form with default values
  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      idType: "",
      idNumber: "",
      idDocumentUrl: uploadedFiles.idDocument || "",
      addressProofUrl: uploadedFiles.addressProof || "",
      businessLicenseUrl: uploadedFiles.businessLicense || "",
    },
  });

  // Update form when uploads change
  useEffect(() => {
    form.setValue("idDocumentUrl", uploadedFiles.idDocument || "");
    form.setValue("addressProofUrl", uploadedFiles.addressProof || "");
    form.setValue("businessLicenseUrl", uploadedFiles.businessLicense || "");
  }, [uploadedFiles, form]);

  // Mutation to submit KYC
  const mutation = useMutation({
    mutationFn: async (values: KycFormValues) => {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit KYC");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "KYC Documents Submitted Successfully! 🎉",
        description:
          "Thank you for submitting your verification documents. You'll receive an email update within 24-48 hours.",
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Automated document validation
  const validateDocument = (file: File, type: string): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    // Size validation
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    // Type validation
    if (!allowedTypes.includes(file.type)) {
      return 'File must be JPG, PNG, or PDF format';
    }
    
    // Name validation (basic quality check)
    if (file.name.length > 100) {
      return 'File name is too long';
    }
    
    // Additional validation for different document types
    if (type === 'idDocument' && file.size < 50000) { // 50KB minimum
      return 'ID document file seems too small. Please ensure it\'s a clear, readable image';
    }
    
    return null;
  };

  // File upload function
  const uploadFile = async (
    type: "idDocument" | "addressProof" | "businessLicense",
    file: File,
  ) => {
    if (!file) return;
    
    // Clear previous validation error
    setValidationErrors(prev => ({ ...prev, [type]: undefined }));
    
    // Validate document
    const validationError = validateDocument(file, type);
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, [type]: validationError }));
      return;
    }

    setIsUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", type);

      // Map the frontend type to backend type
      const docTypeMap = {
        idDocument: "id",
        addressProof: "proof_of_address",
        businessLicense: "business_registration",
      };

      // Send request to upload endpoint
      const response = await fetch("/api/kyc/doc-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload file");
      }

      const data = await response.json();

      // Update uploaded files state with the URL from the response
      setUploadedFiles((prev) => ({
        ...prev,
        [type]: data.fileUrl,
      }));
      
      // Create preview for uploaded file
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadPreviews(prev => ({
            ...prev,
            [type]: { file, preview: e.target?.result as string }
          }));
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, show file icon
        setUploadPreviews(prev => ({
          ...prev,
          [type]: { file, preview: 'pdf' }
        }));
      }

      toast({
        title: "Document Uploaded Successfully",
        description: `Your ${type.replace(/([A-Z])/g, ' $1').toLowerCase()} has been uploaded and is ready for review.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // File input handler
  const handleFileSelect =
    (type: "idDocument" | "addressProof" | "businessLicense") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        uploadFile(type, e.target.files[0]);
      }
    };

  // Handle form submission
  const onSubmit = (values: KycFormValues) => {
    mutation.mutate(values);
  };

  // If already has KYC, show status
  if (kycData) {
    return (
      <div className="container max-w-3xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">KYC Verification Status</CardTitle>
            <CardDescription>
              Your Know Your Customer (KYC) application status
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-center p-8">
                {kycData.status === "pending" ? (
                  <div className="text-center">
                    <div className="mb-8">
                      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-10 w-10 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You for Your Submission!</h3>
                      <p className="text-lg text-gray-600 mb-6">
                        Your KYC documents have been successfully submitted and are currently under review.
                      </p>
                    </div>

                    {/* Timeline */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                      <h4 className="font-semibold text-amber-900 mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Expected Review Timeline
                      </h4>
                      <div className="space-y-3 text-left">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-amber-500 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium text-amber-900">Within 24-48 hours</p>
                            <p className="text-sm text-amber-700">Our verification team will review your documents</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium text-gray-700">Email notification</p>
                            <p className="text-sm text-gray-600">You'll receive an update once the review is complete</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium text-gray-700">Full platform access</p>
                            <p className="text-sm text-gray-600">Unlock all features after approval</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* What to do while waiting */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                      <h4 className="font-semibold text-blue-900 mb-4">What You Can Do While Waiting</h4>
                      <div className="grid md:grid-cols-2 gap-4 text-left">
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900">Browse Business Opportunities</p>
                              <p className="text-sm text-blue-700">Explore available businesses and investment opportunities</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900">Complete Your Profile</p>
                              <p className="text-sm text-blue-700">Add more details to enhance your profile</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900">Limited Business Listing</p>
                              <p className="text-sm text-blue-700">Create listings (requires approval to go live)</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900">Contact Restrictions</p>
                              <p className="text-sm text-blue-700">Direct messaging available after verification</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact support */}
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Questions about your application? Our support team is here to help.
                      </p>
                      <Button variant="outline" size="sm">
                        Contact Support
                      </Button>
                    </div>
                  </div>
                ) : kycData.status === "approved" ? (
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium">Approved</h3>
                    <p className="text-muted-foreground mt-2">
                      Your KYC application has been approved. You now have full
                      access to all platform features.
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium">Rejected</h3>
                    <p className="text-muted-foreground mt-2">
                      Your KYC application has been rejected. Please review the
                      reason below and submit a new application.
                    </p>
                    <Alert variant="destructive" className="mt-4 text-left">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Rejection Reason</AlertTitle>
                      <AlertDescription>
                        {kycData.rejectionReason ||
                          "No specific reason provided."}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Type</span>
                  <span className="font-medium">{kycData.idType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Number</span>
                  <span className="font-medium">{kycData.idNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted On</span>
                  <span className="font-medium">
                    {kycData.createdAt
                      ? new Date(kycData.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                {kycData.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed On</span>
                    <span className="font-medium">
                      {kycData.reviewedAt
                        ? new Date(kycData.reviewedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center border-t px-6 py-4">
            {kycData.status === "rejected" && (
              <Button
                variant="default"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["/api/kyc/status"],
                  })
                }
              >
                Submit New Application
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">KYC Verification</CardTitle>
          <CardDescription>
            Complete your Know Your Customer (KYC) verification to access all
            platform features
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            defaultValue="step1"
            value={step === "upload" ? "step1" : "step2"}
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="step1" onClick={() => setStep("upload")}>
                1. Upload Documents
              </TabsTrigger>
              <TabsTrigger
                value="step2"
                onClick={() => setStep("form")}
                disabled={!uploadedFiles.idDocument}
              >
                2. Complete Application
              </TabsTrigger>
            </TabsList>

            <TabsContent value="step1">
              <div className="space-y-6">
                {/* Document Type Selection Helper */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Required Documents for Verification</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <div>
                        <p className="font-medium text-blue-900">Identity Document (Required)</p>
                        <p className="text-sm text-blue-700">National ID, Passport, or Driver's License</p>
                      </div>
                    </div>
                    {user?.role === 'entrepreneur' && (
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">!</div>
                        <div>
                          <p className="font-medium text-amber-900">Business License (Recommended)</p>
                          <p className="text-sm text-amber-700">Required for business listings and higher trust score</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-lg flex items-center">
                      <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded mr-2">REQUIRED</span>
                      ID Document
                    </h3>
                    <Badge variant="outline" className="text-xs">Step 1 of 2</Badge>
                  </div>
                  <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-2">
                      Upload a clear photo or scan of your government-issued ID.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✓ Accepted: National ID, Passport, Driver's License, Residence Permit</p>
                      <p>✓ Format: JPG, PNG, or PDF (max 10MB)</p>
                      <p>✓ Quality: Document must be clearly readable with all corners visible</p>
                    </div>
                  </div>

                  {uploadedFiles.idDocument ? (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Preview Section */}
                      <div className="flex items-start p-4 bg-green-50 border-b">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">ID Document uploaded successfully</p>
                          <p className="text-sm text-green-700 mt-1">Document is ready for verification</p>
                        </div>
                        {uploadPreviews.idDocument && uploadPreviews.idDocument.preview !== 'pdf' && (
                          <div className="ml-4">
                            <img 
                              src={uploadPreviews.idDocument.preview} 
                              alt="Document preview" 
                              className="w-16 h-16 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-white flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {uploadPreviews.idDocument?.file.name || 'Document uploaded'}
                        </span>
                        <label>
                          <Button size="sm" variant="outline">
                            Replace Document
                          </Button>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="hidden"
                            onChange={handleFileSelect("idDocument")}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full text-center">
                      <label className="cursor-pointer">
                        <div
                          className={`w-full py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                            validationErrors.idDocument 
                              ? "border-red-300 bg-red-50" 
                              : isUploading 
                                ? "bg-muted/50" 
                                : "hover:bg-muted/50 border-gray-300"
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-600" />
                              <p className="font-medium">Uploading document...</p>
                              <p className="text-xs text-muted-foreground mt-1">Please wait while we process your file</p>
                            </>
                          ) : validationErrors.idDocument ? (
                            <>
                              <AlertTriangle className="h-8 w-8 mb-2 text-red-500" />
                              <p className="font-medium text-red-700">Upload Error</p>
                              <p className="text-xs text-red-600 mt-1">{validationErrors.idDocument}</p>
                              <p className="text-xs text-muted-foreground mt-2">Click to try again</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mb-2 text-gray-500" />
                              <p className="font-medium">Click to upload ID Document</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                JPG, PNG or PDF (max 10MB) • Clear, readable image required
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={handleFileSelect("idDocument")}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-lg flex items-center">
                      <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded mr-2">OPTIONAL</span>
                      Address Proof
                    </h3>
                    <Badge variant="secondary" className="text-xs">+10% Trust Score</Badge>
                  </div>
                  <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-2">
                      Verify your address for enhanced account security and trust.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✓ Accepted: Utility bill, Bank statement, Government mail</p>
                      <p>✓ Age: Document must be less than 3 months old</p>
                      <p>✓ Name: Must match your account name</p>
                    </div>
                  </div>

                  {uploadedFiles.addressProof ? (
                    <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span>Address Proof uploaded successfully</span>
                      </div>
                      <label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.preventDefault()}
                        >
                          Replace
                        </Button>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={handleFileSelect("addressProof")}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="w-full text-center">
                      <label className="cursor-pointer">
                        <div
                          className={`w-full py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${
                            isUploading ? "bg-muted/50" : "hover:bg-muted/50"
                          } transition-colors`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin mb-2" />
                              <p>Uploading...</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mb-2" />
                              <p>Click to upload Address Proof</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                JPG, PNG or PDF (max 10MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={handleFileSelect("addressProof")}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-lg flex items-center">
                      {user?.role === 'entrepreneur' ? (
                        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded mr-2">RECOMMENDED</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded mr-2">OPTIONAL</span>
                      )}
                      Business License
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {user?.role === 'entrepreneur' ? 'Required for Business Listings' : 'For Business Features'}
                    </Badge>
                  </div>
                  <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-2">
                      {user?.role === 'entrepreneur' 
                        ? 'Required to create and manage business listings on our platform.'
                        : 'Upload if you plan to use business features or create company listings.'
                      }
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✓ Accepted: Business License, Trade License, Incorporation Certificate</p>
                      <p>✓ Status: Must be active and valid</p>
                      <p>✓ Name: Business name should match your profile</p>
                    </div>
                  </div>

                  {uploadedFiles.businessLicense ? (
                    <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span>Business License uploaded successfully</span>
                      </div>
                      <label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.preventDefault()}
                        >
                          Replace
                        </Button>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={handleFileSelect("businessLicense")}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="w-full text-center">
                      <label className="cursor-pointer">
                        <div
                          className={`w-full py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${
                            isUploading ? "bg-muted/50" : "hover:bg-muted/50"
                          } transition-colors`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin mb-2" />
                              <p>Uploading...</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mb-2" />
                              <p>Click to upload Business License</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                JPG, PNG or PDF (max 10MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={handleFileSelect("businessLicense")}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 text-center">
                <Button
                  size="lg"
                  onClick={() => setStep("form")}
                  disabled={!uploadedFiles.idDocument}
                >
                  Continue to Next Step
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step2">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="idType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ID type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="passport">
                                  Passport
                                </SelectItem>
                                <SelectItem value="national_id">
                                  National ID
                                </SelectItem>
                                <SelectItem value="drivers_license">
                                  Driver's License
                                </SelectItem>
                                <SelectItem value="residence_permit">
                                  Residence Permit
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the type of ID document you've uploaded
                            </FormDescription>
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
                              <Input placeholder="Enter ID number" {...field} />
                            </FormControl>
                            <FormDescription>
                              The number on your identification document
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-4">Document Uploads</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <span>ID Document uploaded</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStep("upload")}
                          >
                            View
                          </Button>
                        </div>

                        {uploadedFiles.addressProof && (
                          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              <span>Address Proof uploaded</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setStep("upload")}
                            >
                              View
                            </Button>
                          </div>
                        )}

                        {uploadedFiles.businessLicense && (
                          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              <span>Business License uploaded</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setStep("upload")}
                            >
                              View
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Alert className="mt-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important Notice</AlertTitle>
                    <AlertDescription>
                      By submitting this application, you confirm that all
                      provided information is accurate and authentic. Submission
                      of false information may result in account termination and
                      legal action.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("upload")}
                    >
                      Back to Documents
                    </Button>

                    <Button
                      type="submit"
                      disabled={mutation.isPending}
                      size="lg"
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit KYC Application"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
