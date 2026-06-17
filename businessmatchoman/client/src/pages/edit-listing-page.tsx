import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertListingSchema,
  InsertListing,
  type Listing,
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLanguageContext } from "@/components/providers/language-provider";
import {
  BUSINESS_CATEGORIES,
  LOCATIONS,
  TRANSACTION_TYPES,
} from "@shared/types";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { MultipleImageUpload } from "@/components/forms/multiple-image-upload";
import { DocumentUpload } from "@/components/forms/document-upload";

// Create a form-specific schema that matches the form fields
const editListingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Industry is required"),
  location: z.string().min(1, "Location is required"),
  saleType: z.string().min(1, "Transaction type is required"),
  currency: z.string().default("OMR"),
  askingPrice: z.number().min(0, "Price must be positive"),
  businessPlan: z.string().optional(),
  financials: z.string().optional(),
  employees: z.number().optional(),
  yearEstablished: z.number().optional(),
  monthlyRevenue: z.number().optional(),
  monthlyProfit: z.number().optional(),
  assets: z.string().optional(),
  liabilities: z.string().optional(),
  reasonForSelling: z.string().optional(),
  timeframe: z.string().optional(),
  training: z.string().optional(),
  support: z.string().optional(),
  images: z.array(z.string()).optional(),
});

type EditListingFormData = z.infer<typeof editListingFormSchema>;

export default function EditListingPage() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguageContext();

  // Fetch the existing listing
  const {
    data: listing,
    isLoading: listingLoading,
    error,
  } = useQuery<Listing>({
    queryKey: ["/api/listings", id],
    queryFn: () => fetch(`/api/listings/${id}`).then((res) => res.json()),
    enabled: !!id && !isNaN(Number(id)),
  });

  // Fetch documents for this listing
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["/api/listings", id, "documents"],
    queryFn: () =>
      fetch(`/api/listings/${id}/documents`).then((res) => res.json()),
    enabled: !!id && !isNaN(Number(id)),
  });

  const form = useForm<EditListingFormData>({
    resolver: zodResolver(editListingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
      saleType: "",
      currency: "OMR",
      askingPrice: 0,
      businessPlan: "",
      financials: "",
      employees: 0,
      yearEstablished: 0,
      monthlyRevenue: 0,
      monthlyProfit: 0,
      assets: "",
      liabilities: "",
      reasonForSelling: "",
      timeframe: "",
      training: "",
      support: "",
      images: [],
    },
  });

  // Update form when listing data loads
  useEffect(() => {
    if (listing) {
      // Check if user owns this listing
      if (listing.userId !== user?.id) {
        toast({
          title: t('alerts.listing.accessDenied'),
          description: t('alerts.listing.accessDeniedDesc'),
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      form.reset({
        title: listing.title_en || "",
        description: listing.description_en || "",
        category: listing.industry || "",
        location: listing.location || "",
        saleType: listing.saleType || "",
        currency: listing.currency || "OMR",
        askingPrice: listing.askingPrice || 0,
        businessPlan: listing.businessPlan || "",
        financials: listing.financials || "",
        employees: listing.employees || 0,
        yearEstablished: listing.yearEstablished || 0,
        monthlyRevenue: listing.monthlyRevenue || 0,
        monthlyProfit: listing.monthlyProfit || 0,
        assets: listing.assets || "",
        liabilities: listing.liabilities || "",
        reasonForSelling: listing.reasonForSelling || "",
        timeframe: listing.timeframe || "",
        training: listing.training || "",
        support: listing.support || "",
        images: listing.images || [],
      });
    }
  }, [listing, form, user, toast, navigate]);

  const updateListingMutation = useMutation({
    mutationFn: async (data: EditListingFormData) => {
      try {
        console.log("[DEBUG] Form data received:", data);

        // Transform form data to match backend API expectations
        // Backend expects bilingual fields: title_en, title_ar, description_en, description_ar
        const updateData = {
          title_en: data.title,
          title_ar: data.title, // Using same content for both languages in edit mode
          description_en: data.description,
          description_ar: data.description, // Using same content for both languages in edit mode
          industry: data.category, // Map category to industry
          location: data.location,
          saleType: data.saleType,
          currency: data.currency,
          askingPrice: data.askingPrice,
          businessPlan: data.businessPlan || null,
          financials: data.financials || null,
          employees: data.employees || null,
          yearEstablished: data.yearEstablished || null,
          monthlyRevenue: data.monthlyRevenue || null,
          monthlyProfit: data.monthlyProfit || null,
          assets: data.assets || null,
          liabilities: data.liabilities || null,
          reasonForSelling: data.reasonForSelling || null,
          timeframe: data.timeframe || null,
          training: data.training || null,
          support: data.support || null,
          images: data.images || [],
        };

        console.log("[DEBUG] Sending update data:", updateData);

        return apiRequest("PUT", `/api/listings/${id}`, updateData);
      } catch (error) {
        console.error("[ERROR] Update listing mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: t('alerts.listing.listingUpdated'),
        description: t('alerts.listing.listingUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", id] });
      navigate(`/listings/${id}`);
    },
    onError: (error: any) => {
      console.error("[ERROR] Update listing failed:", error);
      console.error("[ERROR] Error details:", {
        message: error.message,
        stack: error.stack,
        status: error.status,
      });
      toast({
        title: "Error",
        description: error.message || "Failed to update listing",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EditListingFormData) => {
    updateListingMutation.mutate(data);
  };

  if (listingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Listing Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The listing you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/listings/${id}`)}
                  size="sm"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Listing
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Edit Listing
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Update your business listing information
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    Business Information
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Update your business listing details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      {/* Basic Information */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Title*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter business name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Description*</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your business, what it does, its unique selling points..."
                                className="min-h-24"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select industry" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BUSINESS_CATEGORIES.map((category) => (
                                    <SelectItem
                                      key={category.id}
                                      value={category.name}
                                    >
                                      {category.name}
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
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {LOCATIONS.map((location) => (
                                    <SelectItem key={location} value={location}>
                                      {location}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="saleType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transaction Type*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select transaction type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TRANSACTION_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="OMR" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="OMR">OMR</SelectItem>
                                    <SelectItem value="AED">AED</SelectItem>
                                    <SelectItem value="SAR">SAR</SelectItem>
                                    <SelectItem value="QAR">QAR</SelectItem>
                                    <SelectItem value="BHD">BHD</SelectItem>
                                    <SelectItem value="KWD">KWD</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name="askingPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Asking Price*</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Optional Business Details */}
                      <div className="space-y-6 pt-6 border-t">
                        <h3 className="text-lg font-semibold">
                          Additional Business Details (Optional)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField
                            control={form.control}
                            name="employees"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Employees</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : 0,
                                      )
                                    }
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="yearEstablished"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Year Established</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="2020"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : 0,
                                      )
                                    }
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="timeframe"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sale Timeframe</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., 3-6 months"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  When you want to complete the sale
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="monthlyRevenue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Monthly Revenue</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : 0,
                                      )
                                    }
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Average monthly revenue in{" "}
                                  {form.getValues("currency") || "OMR"}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="monthlyProfit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Monthly Profit</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : 0,
                                      )
                                    }
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Average monthly profit in{" "}
                                  {form.getValues("currency") || "OMR"}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="assets"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assets Included</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Equipment, inventory, property, vehicles..."
                                    className="min-h-24"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Physical and digital assets included in the
                                  sale
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="liabilities"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Liabilities</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Debts, loans, obligations..."
                                    className="min-h-24"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Outstanding debts or obligations
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="reasonForSelling"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason for Selling</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Retirement, relocation, new ventures..."
                                  className="min-h-24"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Help buyers understand your motivation
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="training"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Training & Support</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Training period, ongoing support offered..."
                                    className="min-h-24"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  What training and support will you provide?
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="support"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Post-Sale Support</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Consultation, transition help, warranties..."
                                    className="min-h-24"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Additional support after the sale
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Business Plan and Financials */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">
                          Business Strategy & Financials
                        </h3>

                        <FormField
                          control={form.control}
                          name="businessPlan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Business Plan & Strategy (Optional)
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe your business model, growth strategy, market opportunities..."
                                  className="min-h-20"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Include business model, target market,
                                competitive advantages, growth projections
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="financials"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Financial Information (Optional)
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Share financial highlights, revenue, profit margins, assets..."
                                  className="min-h-24"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Include key financial metrics, revenue trends,
                                assets, liabilities. Keep confidential details
                                private.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Documents Section */}
                      <div className="mt-4 pt-4 border-t">
                        <DocumentUpload
                          listingId={Number(id)}
                          documents={documents}
                          onDocumentUploaded={() => refetchDocuments()}
                          onDocumentDeleted={() => refetchDocuments()}
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(`/listings/${id}`)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateListingMutation.isPending}
                        >
                          {updateListingMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Listing"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Editing Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 text-sm">✓</span>
                      <span>
                        Add detailed business information to attract serious
                        buyers
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 text-sm">✓</span>
                      <span>
                        Include financial data to build trust with investors
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 text-sm">✓</span>
                      <span>Mention training and support to add value</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 text-sm">✓</span>
                      <span>
                        Upload relevant documents to support your listing
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Images & Media</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <MultipleImageUpload
                          value={field.value || []}
                          onChange={field.onChange}
                          maxImages={6}
                          maxFileSize={5}
                        />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
