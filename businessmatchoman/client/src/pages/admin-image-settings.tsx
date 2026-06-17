import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { refreshSettings } from "@/hooks/use-settings";

const AdminImageSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isRtl } = useRTL();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any[]>([]);
  const [updatedImages, setUpdatedImages] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/admin/login");
    } else if (user?.role !== "admin") {
      setLocation("/");
      toast({
        title: t('admin.imageSettings.accessDenied'),
        description: t('admin.imageSettings.noPermission'),
        variant: "destructive",
      });
    }
  }, [user, authLoading, setLocation, toast]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/settings");
        if (!res.ok) throw new Error("Failed to fetch settings");

        const allSettings = await res.json();

        // Filter only image settings
        const imageSettings = allSettings.filter(
          (setting: any) =>
            setting.type === "image" ||
            ["site_logo", "hero_background", "company_favicon"].includes(
              setting.key,
            ),
        );

        setSettings(imageSettings);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({
          title: t('admin.imageSettings.error'),
          description: t('admin.imageSettings.failedToLoad'),
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSaveChanges = async () => {
    if (Object.keys(updatedImages).length === 0) {
      toast({
        title: t('admin.imageSettings.noChanges'),
        description: t('admin.imageSettings.noChangesToSave'),
      });
      return;
    }

    setIsSaving(true);

    try {
      // Convert the updatedImages object to an array of settings objects
      // as required by the API endpoint
      const settingsArray = Object.entries(updatedImages).map(
        ([key, value]) => ({
          key,
          value,
          type: "image",
        }),
      );

      console.log("Sending settings update:", settingsArray);

      const res = await apiRequest(
        "PATCH",
        "/api/admin/settings",
        settingsArray,
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });

      toast({
        title: t('admin.imageSettings.success'),
        description: t('admin.imageSettings.settingsUpdated'),
      });

      setUpdatedImages({});
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t('admin.imageSettings.error'),
        description:
          error instanceof Error
            ? error.message
            : t('admin.imageSettings.saveError'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload =
    (key: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Reset the file input so the same file can be selected again if needed
      const fileInput = e.target;
      const file = fileInput.files?.[0];

      if (!file) {
        toast({
          title: t('admin.imageSettings.noFileSelected'),
          description: t('admin.imageSettings.selectImageFile'),
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "image/x-icon",
        "image/vnd.microsoft.icon",
      ];
      if (!validImageTypes.includes(file.type)) {
        toast({
          title: t('admin.imageSettings.invalidFileType'),
          description:
            t('admin.imageSettings.validImageTypes'),
          variant: "destructive",
        });
        fileInput.value = "";
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('admin.imageSettings.fileTooLarge'),
          description: t('admin.imageSettings.imageSizeLimit'),
          variant: "destructive",
        });
        fileInput.value = "";
        return;
      }

      // Show loading state
      setIsSaving(true);
      toast({
        title: t('admin.imageSettings.processingImage'),
        description: t('admin.imageSettings.uploadInProgress'),
      });

      try {
        console.log(
          `[DEBUG] Uploading file: ${file.name} (${file.size} bytes, type: ${file.type})`,
        );

        // Create FormData to send file to server
        const formData = new FormData();
        formData.append("image", file);
        formData.append("settingKey", key);

        // Get the authorization token
        const authHeader = localStorage.getItem("authToken");
        if (!authHeader) {
          throw new Error(
            "Authentication token not found. Please log in again.",
          );
        }

        console.log(`[DEBUG] Uploading image for setting: ${key}`);

        // Use fetch directly to handle FormData
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authHeader}`,
            // No Content-Type header - browser will set it automatically with boundary
          },
          body: formData,
        });

        // Handle non-OK responses
        if (!res.ok) {
          let errorMessage = "Upload failed with status " + res.status;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
            console.error("[ERROR] Server error details:", errorData);
          } catch (jsonError) {
            console.error("[ERROR] Could not parse error response:", jsonError);
          }
          throw new Error(errorMessage);
        }

        // Parse the successful response
        let result;
        try {
          result = await res.json();
          console.log("[DEBUG] Upload successful, server response:", result);
        } catch (jsonError) {
          console.error("[ERROR] Error parsing success response:", jsonError);
          throw new Error("Server returned invalid response format");
        }

        // Store the URL that comes back from the server
        if (result.url) {
          // Generate a cache-busting URL
          const timestamp = Date.now();
          const randomVal = Math.random().toString(36).substring(2, 15);
          const cacheBuster = `${timestamp}-${randomVal}`;
          const cacheUrl = `${result.url}?nocache=${cacheBuster}`;

          // Add the cache-busting URL to state
          setUpdatedImages((prev) => ({
            ...prev,
            [key]: result.url, // Store the original URL in state
          }));

          // Force cache invalidation for immediate refresh - more aggressive approach
          console.log(
            "[DEBUG] Force invalidating and removing settings queries",
          );

          // First remove all existing queries to force a fresh fetch
          queryClient.removeQueries({ queryKey: ["/api/admin/settings"] });
          queryClient.removeQueries({ queryKey: ["/api/settings"] });

          // Then trigger a full refresh of settings with a small delay
          setTimeout(async () => {
            try {
              console.log("[DEBUG] Refreshing settings after upload");
              await Promise.all([
                queryClient.invalidateQueries({
                  queryKey: ["/api/admin/settings"],
                }),
                queryClient.invalidateQueries({ queryKey: ["/api/settings"] }),
                refreshSettings(), // Use the imported refreshSettings function
              ]);

              // After the refresh, check if the setting was actually updated
              const res = await apiRequest("GET", "/api/admin/settings");
              const allSettings = await res.json();
              const updatedSetting = allSettings.find(
                (s: any) => s.key === key,
              );

              if (updatedSetting && updatedSetting.value === result.url) {
                console.log(
                  `[DEBUG] Setting ${key} successfully verified in database: ${updatedSetting.value}`,
                );
              } else {
                console.warn(
                  `[WARN] Setting ${key} not found in database or has incorrect value`,
                );

                // If the setting wasn't properly updated, try once more with a direct API call
                try {
                  console.log(
                    "[DEBUG] Attempting direct setting update via API",
                  );
                  await apiRequest("PATCH", "/api/admin/settings", [
                    {
                      key: key,
                      value: result.url,
                      type: "image",
                    },
                  ]);
                  console.log("[DEBUG] Manual setting update successful");
                } catch (err) {
                  console.error("[ERROR] Manual setting update failed:", err);
                }
              }
            } catch (refreshErr) {
              console.error(
                "[ERROR] Error during settings refresh:",
                refreshErr,
              );
            }
          }, 200);

          toast({
            title: t('admin.imageSettings.uploadSuccessful'),
            description: t('admin.imageSettings.imageSaved'),
          });

          // Try to preload the image to ensure it's in the browser cache
          const preloadImage = new Image();
          preloadImage.src = cacheUrl;
        } else {
          throw new Error("Server did not return a valid image URL");
        }
      } catch (error) {
        console.error("[ERROR] Image upload error:", error);

        // Show a more detailed error message
        toast({
          title: t('admin.imageSettings.uploadFailed'),
          description:
            error instanceof Error
              ? error.message
              : t('admin.imageSettings.uploadError'),
          variant: "destructive",
        });
      } finally {
        // Reset the file input so the same file can be selected again
        fileInput.value = "";
        setIsSaving(false);
      }
    };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className={`text-2xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.imageSettings.title')}</h1>
        </div>

        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => {
            refreshSettings();
            // Also fetch new settings for the admin page
            queryClient.invalidateQueries({
              queryKey: ["/api/admin/settings"],
            });

            toast({
              title: t('admin.imageSettings.settingsRefreshed'),
              description:
                t('admin.imageSettings.refreshedFromServer'),
            });
          }}
        >
          <RefreshCw className="h-4 w-4" />
          {t('admin.imageSettings.refreshSettings')}
        </Button>
      </div>

      <p className={`text-muted-foreground mb-8 ${isRtl ? 'font-arabic text-right' : ''}`}>
        {t('admin.imageSettings.description')}
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Site Logo */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.imageSettings.siteLogo')}</CardTitle>
            <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>
              {t('admin.imageSettings.uploadCompanyLogo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(updatedImages["site_logo"] ||
              settings.find((s) => s.key === "site_logo")?.value) && (
              <div className="bg-neutral-50 p-4 border rounded-md flex items-center justify-center">
                <img
                  src={`${updatedImages["site_logo"] || settings.find((s) => s.key === "site_logo")?.value}?nocache=${Date.now()}`}
                  alt={t('admin.imageSettings.logoPreview')}
                  className="max-h-96 object-contain"
                  onError={(e) => {
                    console.error("Logo image failed to load, trying fallback");
                    // Try a different approach with a direct path if the image fails to load
                    const imgEl = e.target as HTMLImageElement;
                    const currentSrc = imgEl.src;
                    const basePath = currentSrc.split("?")[0];
                    const fileName = basePath.split("/").pop();
                    if (fileName) {
                      imgEl.src = `/uploads/${fileName}?direct=true&t=${Date.now()}`;
                    }
                  }}
                />
              </div>
            )}

            <div>
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleImageUpload("site_logo")}
                className="hidden"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md cursor-pointer w-full"
              >
                <Upload className="h-5 w-5" />
                {t('admin.imageSettings.uploadLogo')}
              </label>
              <p className={`text-sm text-muted-foreground mt-2 ${isRtl ? 'font-arabic text-right' : ''}`}>
                {t('admin.imageSettings.logoRecommendation')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hero Background */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.imageSettings.heroBackground')}</CardTitle>
            <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>
              {t('admin.imageSettings.heroBackgroundDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(updatedImages["hero_background"] ||
              settings.find((s) => s.key === "hero_background")?.value) && (
              <div className="bg-neutral-50 p-4 border rounded-md">
                <img
                  src={`${updatedImages["hero_background"] || settings.find((s) => s.key === "hero_background")?.value}?nocache=${Date.now()}`}
                  alt={t('admin.imageSettings.backgroundPreview')}
                  className="w-full h-48 object-cover rounded"
                  onError={(e) => {
                    console.error(
                      "Hero background image failed to load, trying fallback",
                    );
                    // Try a different approach with a direct path if the image fails to load
                    const imgEl = e.target as HTMLImageElement;
                    const currentSrc = imgEl.src;
                    const basePath = currentSrc.split("?")[0];
                    const fileName = basePath.split("/").pop();
                    if (fileName) {
                      imgEl.src = `/uploads/${fileName}?direct=true&t=${Date.now()}`;
                    }
                  }}
                />
              </div>
            )}

            <div>
              <input
                type="file"
                id="background-upload"
                accept="image/*"
                onChange={handleImageUpload("hero_background")}
                className="hidden"
              />
              <label
                htmlFor="background-upload"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md cursor-pointer w-full"
              >
                <Upload className="h-5 w-5" />
                {t('admin.imageSettings.uploadBackground')}
              </label>
              <p className={`text-sm text-muted-foreground mt-2 ${isRtl ? 'font-arabic text-right' : ''}`}>
                {t('admin.imageSettings.backgroundRecommendation')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.imageSettings.favicon')}</CardTitle>
            <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>
              {t('admin.imageSettings.faviconDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(updatedImages["company_favicon"] ||
              settings.find((s) => s.key === "company_favicon")?.value) && (
              <div className="bg-neutral-50 p-4 border rounded-md flex items-center justify-center">
                <img
                  src={`${updatedImages["company_favicon"] || settings.find((s) => s.key === "company_favicon")?.value}?nocache=${Date.now()}`}
                  alt={t('admin.imageSettings.faviconPreview')}
                  className="h-16 w-16 object-contain"
                  onError={(e) => {
                    console.error(
                      "Favicon image failed to load, trying fallback",
                    );
                    // Try a different approach with a direct path if the image fails to load
                    const imgEl = e.target as HTMLImageElement;
                    const currentSrc = imgEl.src;
                    const basePath = currentSrc.split("?")[0];
                    const fileName = basePath.split("/").pop();
                    if (fileName) {
                      imgEl.src = `/uploads/${fileName}?direct=true&t=${Date.now()}`;
                    }
                  }}
                />
              </div>
            )}

            <div>
              <input
                type="file"
                id="favicon-upload"
                accept="image/*"
                onChange={handleImageUpload("company_favicon")}
                className="hidden"
              />
              <label
                htmlFor="favicon-upload"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md cursor-pointer w-full"
              >
                <Upload className="h-5 w-5" />
                {t('admin.imageSettings.uploadFavicon')}
              </label>
              <p className={`text-sm text-muted-foreground mt-2 ${isRtl ? 'font-arabic text-right' : ''}`}>
                {t('admin.imageSettings.faviconRecommendation')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminImageSettings;
