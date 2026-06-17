import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertListingSchema, InsertListing, Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLanguageContext } from "@/components/providers/language-provider";
import { useRTL } from "@/hooks/use-rtl";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { MultipleImageUpload } from "@/components/forms/multiple-image-upload";
import { DocumentUpload } from "@/components/forms/document-upload";

export default function CreateListingPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguageContext();
  const isRTL = useRTL();
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);

  // Form validation schema
  const formSchema = insertListingSchema.extend({
    askingPrice: insertListingSchema.shape.askingPrice,
  });

  // React Hook Form
  const form = useForm<InsertListing>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: "",
      title_ar: "",
      industry: "",
      location: "",
      saleType: "",
      askingPrice: 0,
      currency: "OMR",
      description_en: "",
      description_ar: "",
      imageUrl: "",
      images: [],
      businessPlan: "",
      financials: "",
      price: 0,
      establishedDate: "",
      userId: user?.id || 0,
    },
  });

  // Create listing mutation
  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("[DEBUG] Making API request with data:", data);
      const res = await apiRequest("POST", "/api/listings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({
        title: t('alerts.listing.listingCreated'),
        description: t('alerts.listing.listingCreatedDesc'),
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: InsertListing) => {
    console.log("[DEBUG] Form submitted with values:", values);
    console.log("[DEBUG] Current language:", language);
    console.log("[DEBUG] User ID:", user?.id);

    // Extract the title and description from the language-specific fields
    const currentTitle = language === "en" ? values.title_en : values.title_ar;
    const currentDescription =
      language === "en" ? values.description_en : values.description_ar;

    console.log("[DEBUG] Extracted content:", {
      currentTitle,
      currentDescription,
    });

    // Prepare submission data with the correct structure for the server
    const submissionData = {
      // Remove the language-specific fields from values to avoid conflicts
      userId: user?.id || 0,
      industry: values.industry,
      location: values.location,
      saleType: values.saleType,
      askingPrice: values.askingPrice,
      currency: values.currency || "OMR",
      imageUrl:
        values.images && values.images.length > 0 ? values.images[0] : "", // Use first image as main imageUrl for backward compatibility
      images: values.images || [],
      price: values.price || 0,
      businessPlan: values.businessPlan || "",
      financials: values.financials || "",
      establishedDate: values.establishedDate || "",
      active: values.active ?? true,
      // Add the title and description that the server expects
      title: currentTitle,
      description: currentDescription,
      sourceLanguage: language, // 'en' or 'ar'
    };

    console.log("[DEBUG] Final submission data:", submissionData);

    // Send the data to the server for processing and translation
    createListingMutation.mutate(submissionData);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 bg-neutral-100">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">{t("createListing.page.title")}</h1>
          <p className="text-neutral-500 mb-8">
            {t("createListing.page.subtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("createListing.form.titles.listingInformation")}</CardTitle>
                  <CardDescription>
                    {t("createListing.form.descriptions.provideDetails")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name={language === "en" ? "title_en" : "title_ar"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("createListing.form.labels.listingTitle")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={
                                  language === "en"
                                    ? t("createListing.form.placeholders.titleExample")
                                    : t("createListing.form.placeholders.titleExampleAr")
                                }
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("createListing.form.helpText.titleHelp")}
                              {language === "en"
                                ? t("createListing.form.helpText.autoTranslateToArabic")
                                : t("createListing.form.helpText.autoTranslateToEnglish")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("createListing.form.labels.industry")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("createListing.form.placeholders.selectIndustry")} />
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
                              <FormLabel>{t("createListing.form.labels.location")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("createListing.form.placeholders.selectLocation")} />
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="saleType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("createListing.form.labels.transactionType")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("createListing.form.placeholders.selectTransactionType")} />
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
                                <FormLabel>{t("createListing.form.labels.currency")}</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("createListing.form.placeholders.currencyDefault")} />
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
                                  <FormLabel>{t("createListing.form.labels.askingPrice")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder={t("createListing.form.placeholders.priceDefault")}
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

                      <FormField
                        control={form.control}
                        name={
                          language === "en"
                            ? "description_en"
                            : "description_ar"
                        }
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("createListing.form.labels.businessDescription")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={
                                  language === "en"
                                    ? "Provide a detailed description of your business..."
                                    : "قدم وصفاً مفصلاً لعملك التجاري..."
                                }
                                className="min-h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {language === "en"
                                ? "Include key information such as business history, revenue, assets, reason for selling, etc. (Will be translated to Arabic automatically)"
                                : "أدرج معلومات أساسية مثل تاريخ الأعمال والإيرادات والأصول وسبب البيع ، إلخ. (سيتم ترجمته للإنجليزية تلقائيًا)"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="images"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Images</FormLabel>
                            <FormControl>
                              <MultipleImageUpload
                                value={field.value || []}
                                onChange={field.onChange}
                                maxImages={6}
                                maxFileSize={5}
                                disabled={createListingMutation.isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              Upload up to 6 high-quality images of your
                              business. The first image will be used as the
                              featured image.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Current Price/Revenue (Optional)
                              </FormLabel>
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
                              <FormDescription>
                                Current business price or annual revenue
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="establishedDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Business Established (Optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="e.g., 2018 or January 2018"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                When was your business established?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                                          : undefined,
                                      )
                                    }
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
                                          : undefined,
                                      )
                                    }
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                          : undefined,
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormDescription>
                                  Average monthly revenue (optional)
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
                                          : undefined,
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormDescription>
                                  Average monthly profit (optional)
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      <FormField
                        control={form.control}
                        name="businessPlan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Plan (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Provide details about your business plan, growth strategy, market analysis..."
                                className="min-h-24"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Include business model, target market, competitive
                              advantages, growth projections
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

                      {/* Documents Section */}
                      <div className="mt-6 pt-6 border-t">
                        <DocumentUpload 
                          documents={uploadedDocuments}
                          onDocumentUploaded={(document) => {
                            setUploadedDocuments(prev => [...prev, document]);
                          }}
                          onDocumentDeleted={(documentId) => {
                            setUploadedDocuments(prev => 
                              prev.filter(doc => doc.id !== documentId)
                            );
                          }}
                        />
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/dashboard")}
                        >
                          {t("createListing.actions.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={createListingMutation.isPending}
                        >
                          {createListingMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("createListing.actions.creating")}
                            </>
                          ) : (
                            t("createListing.actions.create")
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t("createListing.guidelines.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="material-icons text-green-500 mr-2 text-base">
                        check_circle
                      </span>
                      <span>
                        Be honest and transparent about your business details
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="material-icons text-green-500 mr-2 text-base">
                        check_circle
                      </span>
                      <span>
                        Include key financial information that buyers/investors
                        need
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="material-icons text-green-500 mr-2 text-base">
                        check_circle
                      </span>
                      <span>
                        Highlight unique selling points of your business
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="material-icons text-green-500 mr-2 text-base">
                        check_circle
                      </span>
                      <span>
                        Provide clear contact information for inquiries
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="material-icons text-red-500 mr-2 text-base">
                        cancel
                      </span>
                      <span>
                        Don't include confidential information in public listing
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4 text-sm">
                    <li className="flex items-start">
                      <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Create your listing</p>
                        <p className="text-neutral-500">
                          Fill in all required information about your business
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-neutral-200 text-neutral-700 w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Verification process</p>
                        <p className="text-neutral-500">
                          Our team will review your listing
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-neutral-200 text-neutral-700 w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Connect with buyers</p>
                        <p className="text-neutral-500">
                          Respond to inquiries from interested parties
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-neutral-200 text-neutral-700 w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Close your deal</p>
                        <p className="text-neutral-500">
                          Finalize your business transaction
                        </p>
                      </div>
                    </li>
                  </ol>
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
