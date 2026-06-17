import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Settings as SettingsIcon,
  Info,
  Globe,
  Mail,
  Shield,
  AlertTriangle,
  ArrowLeft,
  User,
  Palette,
  Phone,
  Heading,
  Search,
  AlertOctagon,
  Share2,
  ToggleLeft,
  LogOut,
  ImageIcon,
  Trash,
  Loader2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { refreshSettings, useSettings } from "@/hooks/use-settings";
import { getAuthToken } from "@/lib/authUtils";
import { settingTypes } from "@shared/schema";
import type { Setting, UpdateSettings } from "@shared/schema";
import ChangePasswordForm from "@/components/admin/change-password";

type SettingInputProps = {
  setting: Setting;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
};

// Helper to produce a human‑friendly label for unknown keys
function humanizeSettingKey(key: string, t: (k: string, opts?: any) => string) {
  // Prefer explicit translations if provided
  const translated = t(`admin.settings.keyLabels.${key}`, { defaultValue: "" });
  if (translated && translated !== `admin.settings.keyLabels.${key}`) {
    return translated;
  }

  // Fallback: build a readable label
  const parts = key.split(".");
  const last = parts[parts.length - 1];
  const withoutSuffix = last.replace(/_(en|ar)$/i, "");
  const suffix = /_en$/i.test(last)
    ? ` (${t("admin.settings.lang.english", { defaultValue: "English" })})`
    : /_ar$/i.test(last)
    ? ` (${t("admin.settings.lang.arabic", { defaultValue: "Arabic" })})`
    : "";

  const words = withoutSuffix
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

  // If there is a namespace like `headings.*`, include a friendly prefix
  let prefix = "";
  if (parts.length > 1) {
    const group = parts.slice(0, parts.length - 1).join(".");
    prefix = t(`admin.settings.group.${group}`, { defaultValue: "" });
    if (prefix && prefix !== `admin.settings.group.${group}`) {
      prefix = `${prefix}: `;
    } else {
      prefix = parts.length > 1 ? parts[0].replace(/\b\w/g, (m) => m.toUpperCase()) + ": " : "";
    }
  }

  return `${prefix}${words}${suffix}`;
}

// Dynamic setting input based on type
const SettingInput = ({
  setting,
  onChange,
  disabled = false,
}: SettingInputProps) => {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Initialize previewImage with existing value if it's an image
  useEffect(() => {
    if (setting.type === "image" && setting.value) {
      setPreviewImage(setting.value);
    }
  }, [setting.value, setting.type]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileSizeInMb = file.size / (1024 * 1024);

    // Validate file size (5MB max)
    if (fileSizeInMb > 5) {
      toast({
        title: t('admin.settings.fileTooLarge'),
        description: t('admin.settings.selectImageUnder5MB'),
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('admin.settings.invalidFileType'),
        description: t('admin.settings.selectValidImageType'),
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Read the file as a base64 string
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) return;

        const imageData = event.target.result as string;

        // Create a preview
        setPreviewImage(imageData);

        // Upload to server
        try {
          const res = await apiRequest("POST", "/api/admin/upload", {
            imageData,
            imageName: file.name,
            imageType: file.type,
          });

          if (!res.ok) {
            throw new Error("Failed to upload image");
          }

          const data = await res.json();

          // Update the setting with the image URL from the server
          onChange(setting.key, data.url);

          toast({
            title: t('admin.settings.imageUploaded'),
            description: t('admin.settings.imageUploadedSuccessfully'),
          });
        } catch (error) {
          console.error("Image upload error:", error);
          toast({
            title: t('admin.settings.uploadFailed'),
            description: t('admin.settings.uploadFailedMessage'),
            variant: "destructive",
          });
          // Reset preview if upload failed
          setPreviewImage(setting.value || null);
        }

        setUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File read error:", error);
      setUploadingImage(false);
      toast({
        title: t('admin.settings.fileError'),
        description: t('admin.settings.fileErrorMessage'),
        variant: "destructive",
      });
    }
  };

  switch (setting.type) {
    case "image":
      return (
        <div className="space-y-2">
          {previewImage && (
            <div className="relative w-full h-48 border rounded-md overflow-hidden bg-neutral-100">
              <img
                src={
                  previewImage.startsWith("data:") ? previewImage : previewImage
                }
                alt={t('admin.settings.preview')}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={disabled || uploadingImage}
              className="hidden"
              id={`file-${setting.key}`}
            />
            <Button
              type="button"
              disabled={disabled || uploadingImage}
              asChild
              variant="outline"
            >
              <label
                htmlFor={`file-${setting.key}`}
                className="cursor-pointer flex items-center gap-2"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('admin.settings.uploading')}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    {previewImage ? t('admin.settings.changeImage') : t('admin.settings.uploadImage')}
                  </>
                )}
              </label>
            </Button>
            {previewImage && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setPreviewImage(null);
                  onChange(setting.key, "");
                }}
                disabled={disabled || uploadingImage}
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
          {setting.value && (
            <p className="text-xs text-muted-foreground break-all">
              {setting.value}
            </p>
          )}
        </div>
      );
    case "boolean":
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={setting.key}
            checked={setting.value === "true"}
            onCheckedChange={(checked) =>
              onChange(setting.key, checked ? "true" : "false")
            }
            disabled={disabled}
          />
          <Label htmlFor={setting.key} className={isRtl ? 'font-arabic' : ''}>{t('admin.settings.enabled')}</Label>
        </div>
      );
    case "text":
      return (
        <Input
          id={setting.key}
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          disabled={disabled}
        />
      );
    case "url":
      return (
        <Input
          id={setting.key}
          type="url"
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          disabled={disabled}
          placeholder={t('admin.settings.urlPlaceholder')}
        />
      );
    case "email":
      return (
        <Input
          id={setting.key}
          type="email"
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          disabled={disabled}
          placeholder={t('admin.settings.emailPlaceholder')}
        />
      );
    case "number":
      return (
        <Input
          id={setting.key}
          type="number"
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          disabled={disabled}
        />
      );
    case "json":
      return (
        <Textarea
          id={setting.key}
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          disabled={disabled}
          className="min-h-[100px] font-mono text-sm"
        />
      );
    default:
      return (
        <Textarea
          id={setting.key}
          value={setting.value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          disabled={disabled}
        />
      );
  }
};

type SettingSectionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  settings: Setting[];
  updatedSettings: Record<string, string>;
  setUpdatedSettings: (
    fn: (prev: Record<string, string>) => Record<string, string>,
  ) => void;
  isPending: boolean;
};

const SettingSection = ({
  title,
  description,
  icon,
  settings,
  updatedSettings,
  setUpdatedSettings,
  isPending,
}: SettingSectionProps) => {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  console.log(`[DEBUG] SettingSection: ${title} received settings:`, settings);

  if (!settings || !Array.isArray(settings) || settings.length === 0) {
    return (
      <Alert variant="default" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.noSettingsFound')}</AlertTitle>
        <AlertDescription className={isRtl ? 'font-arabic text-right' : ''}>
          {t('admin.settings.noSettingsConfigured')}
        </AlertDescription>
      </Alert>
    );
  }

  const handleChange = (key: string, value: string) => {
    console.log(`[DEBUG] Setting ${key} changed to ${value}`);
    setUpdatedSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      console.log("[DEBUG] Updated settings state:", newSettings);
      return newSettings;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{title}</CardTitle>
            <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="space-y-2">
            <Label htmlFor={setting.key} className={`text-sm font-medium ${isRtl ? 'font-arabic text-right' : ''}`}>
              {humanizeSettingKey(setting.key, t)}
            </Label>
            <SettingInput
              setting={{
                ...setting,
                value:
                  updatedSettings[setting.key] !== undefined
                    ? updatedSettings[setting.key]
                    : setting.value,
              }}
              onChange={handleChange}
              disabled={isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Helper function to categorize settings
const categorizeSettings = (settings: Setting[]) => {
  console.log("[DEBUG] categorizeSettings received settings:", settings);

  if (!settings || !Array.isArray(settings)) {
    console.error(
      "[ERROR] Invalid settings data provided to categorizeSettings:",
      settings,
    );
    return {
      general: [],
      theme: [],
      images: [],
      contact: [],
      seo: [],
      social: [],
      features: [],
      security: [],
      account: [],
    };
  }

  const categories = {
    general: [] as Setting[],
    theme: [] as Setting[],
    images: [] as Setting[],
    contact: [] as Setting[],
    seo: [] as Setting[],
    social: [] as Setting[],
    features: [] as Setting[],
    security: [] as Setting[],
    account: [] as Setting[],
  };

  // First, use the category field from the database if available
  settings.forEach((setting) => {
    // Check if the setting has a category field and it's one of our predefined categories
    if (setting.category && categories.hasOwnProperty(setting.category)) {
      categories[setting.category as keyof typeof categories].push(setting);
    }
    // Special case for image settings - we want to group them separately
    else if (
      setting.type === "image" ||
      [
        "site_logo",
        "company_favicon",
        "hero_background",
        "default_listing_image",
        "default_profile_image",
        "max_image_size",
        "allowed_image_types",
      ].includes(setting.key)
    ) {
      categories.images.push(setting);
    }
    // Fallback to categorical parsing based on key names
    else {
      const key = setting.key.toLowerCase();
      if (
        key.includes("theme") ||
        key.includes("hero") ||
        key.includes("color") ||
        key.includes("home") ||
        key.includes("font")
      ) {
        categories.theme.push(setting);
      } else if (
        key.includes("contact") ||
        key.includes("phone") ||
        key.includes("address") ||
        key.includes("map")
      ) {
        categories.contact.push(setting);
      } else if (
        key.includes("seo") ||
        key.includes("meta") ||
        key.includes("description") ||
        key.includes("keyword") ||
        key.includes("og:") ||
        key.includes("google_analytics") ||
        key.includes("robots")
      ) {
        categories.seo.push(setting);
      } else if (
        key.includes("social") ||
        key.includes("facebook") ||
        key.includes("twitter") ||
        key.includes("instagram") ||
        key.includes("linkedin") ||
        key.includes("youtube") ||
        key.includes("whatsapp")
      ) {
        categories.social.push(setting);
      } else if (
        key.includes("feature") ||
        key.includes("module") ||
        key.includes("enable") ||
        key.includes("disable")
      ) {
        categories.features.push(setting);
      } else if (
        key.includes("security") ||
        key.includes("jwt") ||
        key.includes("login_attempts") ||
        key.includes("lockout") ||
        key.includes("session") ||
        key.includes("ip_blocking")
      ) {
        categories.security.push(setting);
      } else if (
        key.includes("password") ||
        key.includes("user") ||
        key.includes("account") ||
        key.includes("email_verification") ||
        key.includes("social_login")
      ) {
        categories.account.push(setting);
      } else {
        categories.general.push(setting);
      }
    }
  });

  return categories;
};

const AdminSettingsPage = () => {
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();
  const { user, isLoading, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [updatedSettings, setUpdatedSettings] = useState<
    Record<string, string>
  >({});
  const [newSettingKey, setNewSettingKey] = useState("");
  const [newSettingValue, setNewSettingValue] = useState("");
  const [newSettingType, setNewSettingType] =
    useState<(typeof settingTypes)[number]>("text");
  const [activeTab, setActiveTab] = useState("general");

  // Handler for logging out
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: t('admin.settings.loggedOut'),
        description: t('admin.settings.loggedOutSuccessfully'),
      });
      setLocation("/auth");
    } catch (error) {
      toast({
        title: t('admin.settings.logoutFailed'),
        description: t('admin.settings.logoutFailedMessage'),
        variant: "destructive",
      });
    }
  };

  // Fetch all settings with enhanced debugging
  const { data: settings = [], isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      console.log("[DEBUG] Fetching admin settings");
      console.log("[DEBUG] Auth token present:", !!getAuthToken());

      try {
        // Ensure we have the latest token
        const token = getAuthToken();
        if (!token) {
          console.error(
            "[ERROR] No auth token found when fetching admin settings",
          );
          throw new Error("Authentication required");
        }

        // Make request with fresh authorization header
        const res = await fetch("/api/admin/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        console.log("[DEBUG] Admin settings API response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error(
            "[ERROR] Admin settings API error:",
            res.status,
            errorText,
          );
          throw new Error(
            `Failed to fetch settings: ${res.status} ${errorText}`,
          );
        }

        const data = await res.json();
        console.log("[DEBUG] Fetched settings data:", data);
        console.log("[DEBUG] Settings data type:", typeof data);
        console.log("[DEBUG] Is settings array?", Array.isArray(data));
        console.log(
          "[DEBUG] Settings data length:",
          Array.isArray(data) ? data.length : "not an array",
        );

        // Extra validation
        if (!Array.isArray(data)) {
          console.error("[ERROR] Settings API returned non-array data");
          throw new Error("Invalid settings data format received");
        }

        return data;
      } catch (error) {
        console.error("[ERROR] Failed to fetch admin settings:", error);
        toast({
          title: t('admin.settings.failedToLoadSettings'),
          description:
            error instanceof Error
              ? error.message
              : t('admin.settings.pleaseTryLoginAgain'),
          variant: "destructive",
        });
        return [];
      }
    },
    retry: 1, // Only retry once
    refetchOnWindowFocus: true,
  });

  // Update settings mutation
  const { mutate: updateSettings, isPending: isUpdatingSettings } = useMutation(
    {
      mutationFn: async (settingsToUpdate: UpdateSettings) => {
        console.log("Updating settings:", settingsToUpdate);
        const res = await apiRequest(
          "PATCH",
          "/api/admin/settings",
          settingsToUpdate,
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to update settings");
        }
        return res.json();
      },
      onSuccess: (data) => {
        console.log("Settings updated successfully:", data);
        toast({
          title: t('admin.settings.settingsUpdated'),
          description: t('admin.settings.changesSuccessfullySaved'),
        });

        // Immediate invalidation and aggressive refresh of settings data

        // Step 1: Update local cache with new data immediately
        if (Array.isArray(data)) {
          const updatedData = settings.map((setting) => {
            const updated = data.find((s) => s.key === setting.key);
            return updated || setting;
          });
          queryClient.setQueryData(["/api/admin/settings"], updatedData);
        }

        // Step 2: Invalidate all settings-related queries
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });

        // Step 3: Force immediate refetch of all settings
        queryClient.refetchQueries({ queryKey: ["/api/settings"] });
        queryClient.refetchQueries({ queryKey: ["/api/admin/settings"] });

        // Step 4: Clear the local updates state
        setUpdatedSettings({});

        // Step 5: Additional safety measure - refresh again after a delay
        setTimeout(() => {
          refreshSettings();
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          queryClient.refetchQueries({ queryKey: ["/api/admin/settings"] });
        }, 1000);

        // Step 6: Force an additional refresh after a longer delay to ensure UI updates
        setTimeout(() => {
          refreshSettings();
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          queryClient.refetchQueries({ queryKey: ["/api/settings"] });
          // Forcefully reload the window for images that might be cached
          if (
            Object.keys(updatedSettings).some(
              (key) =>
                key === "site_logo" ||
                key === "hero_background" ||
                key === "company_favicon",
            )
          ) {
            console.log(
              "[INFO] Image settings were updated, triggering force refresh",
            );
            // Force browser to reload without cache for images
            window.location.reload();
          }
        }, 3000);
      },
      onError: (error) => {
        console.error("Error updating settings:", error);
        toast({
          title: t('admin.settings.failedToUpdateSettings'),
          description:
            error.message || t('admin.settings.updateSettingsErrorMessage'),
          variant: "destructive",
        });
      },
    },
  );

  // Create new setting mutation
  const { mutate: createSetting, isPending: isCreatingSetting } = useMutation({
    mutationFn: async (newSetting: {
      key: string;
      value: string;
      type: (typeof settingTypes)[number];
    }) => {
      const res = await apiRequest("POST", "/api/admin/settings", newSetting);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Setting created successfully:", data);
      toast({
        title: t('admin.settings.settingCreated'),
        description: t('admin.settings.settingCreatedSuccessfully'),
      });

      // Immediate update of caches with the new setting
      if (data) {
        // Update admin settings cache
        const currentAdminSettings =
          queryClient.getQueryData(["/api/admin/settings"]) || [];
        if (Array.isArray(currentAdminSettings)) {
          queryClient.setQueryData(
            ["/api/admin/settings"],
            [...currentAdminSettings, data],
          );
        }

        // Update public settings cache too
        const currentPublicSettings =
          queryClient.getQueryData(["/api/settings"]) || [];
        if (Array.isArray(currentPublicSettings)) {
          queryClient.setQueryData(
            ["/api/settings"],
            [...currentPublicSettings, data],
          );
        }
      }

      // Reset form
      setNewSettingKey("");
      setNewSettingValue("");
      setNewSettingType("text");

      // Aggressive refresh all settings data
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.refetchQueries({ queryKey: ["/api/settings"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/settings"] });

      // Additional refresh after delay for safety
      setTimeout(() => {
        refreshSettings();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: t('admin.settings.failedToCreateSetting'),
        description:
          error.message || t('admin.settings.createSettingErrorMessage'),
        variant: "destructive",
      });
    },
  });

  // Handle individual setting changes
  const handleChange = (key: string, value: string) => {
    console.log(`[DEBUG] Main component - Setting ${key} changed to ${value}`);
    setUpdatedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Check if there are any changes to save
  const hasChanges = Object.keys(updatedSettings).length > 0;

  // Handler for save button
  const handleSave = () => {
    if (!hasChanges) return;

    const settingsToUpdate = Object.entries(updatedSettings).map(
      ([key, value]) => {
        const setting = settings.find((s) => s.key === key);
        return {
          key,
          value,
          type: setting?.type || "text",
        };
      },
    );

    updateSettings(settingsToUpdate);
  };

  // Handler for adding new setting
  const handleAddSetting = () => {
    if (!newSettingKey.trim()) {
      toast({
        title: "Key required",
        description: "Please enter a key for the new setting.",
        variant: "destructive",
      });
      return;
    }

    createSetting({
      key: newSettingKey.trim(),
      value: newSettingValue,
      type: newSettingType,
    });
  };

  const categorizedSettings = categorizeSettings(settings);

  // Check for admin privileges
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    // Redirect to auth page
    setLocation("/auth");
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-4">
        <Link href="/admin">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} /> {t('admin.settings.backToDashboard')}
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('admin.settings.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.settings.subtitle')}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isUpdatingSettings}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
        >
          {isUpdatingSettings ? (
            <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t('admin.settings.saveChanges')}
        </Button>
      </div>

      {isLoadingSettings ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card p-4 rounded-lg border shadow-sm">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                {t('admin.settings.categories')}
              </h3>
              <nav className="space-y-1">
                <Button
                  variant={activeTab === "general" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("general")}
                  size="sm"
                >
                  {t('admin.settings.generalSettings')}
                </Button>
                <Button
                  variant={activeTab === "theme" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("theme")}
                  size="sm"
                >
                  {t('admin.settings.themeAndHome')}
                </Button>
                <Button
                  variant={activeTab === "images" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("images")}
                  size="sm"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {t('admin.settings.imageSettings')}
                  </div>
                </Button>
                <Button
                  variant={activeTab === "contact" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("contact")}
                  size="sm"
                >
                  {t('admin.settings.contactPage')}
                </Button>
                <Button
                  variant={activeTab === "seo" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("seo")}
                  size="sm"
                >
                  {t('admin.settings.seoSettings')}
                </Button>
                <Button
                  variant={activeTab === "social" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("social")}
                  size="sm"
                >
                  {t('admin.settings.socialMedia')}
                </Button>
                <Button
                  variant={activeTab === "features" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("features")}
                  size="sm"
                >
                  {t('admin.settings.platformFeatures')}
                </Button>
                <Button
                  variant={activeTab === "security" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("security")}
                  size="sm"
                >
                  {t('admin.settings.securitySettings')}
                </Button>
                <Button
                  variant={activeTab === "account" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("account")}
                  size="sm"
                >
                  {t('admin.settings.accountSettings')}
                </Button>
                <Button
                  variant={activeTab === "new" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("new")}
                  size="sm"
                >
                  {t('admin.settings.addNewSetting')}
                </Button>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === "general" && (
              <SettingSection
                title={t('admin.settings.generalSettings')}
                description={t('admin.settings.basicApplicationSettings')}
                icon={<SettingsIcon className="h-5 w-5" />}
                settings={categorizedSettings.general}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "security" && (
              <SettingSection
                title={t('admin.settings.securitySettings')}
                description={t('admin.settings.configureSecurityOptions')}
                icon={<Shield className="h-5 w-5" />}
                settings={categorizedSettings.security}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "theme" && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      <div>
                        <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.themeHomePageSettings')}</CardTitle>
                        <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>
                          {t('admin.settings.customizeSiteAppearance')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Image Settings */}
                    <div className="grid gap-8">
                      {/* Site Logo */}
                      <div className="border rounded-md p-5 shadow-sm">
                        <h3 className={`text-lg font-bold mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>{t('admin.settings.siteLogo')}</h3>

                        {settings.find((s) => s.key === "site_logo")?.value && (
                          <div className="mb-4 p-3 bg-gray-50 border rounded flex justify-center">
                            <img
                              src={
                                settings.find((s) => s.key === "site_logo")
                                  ?.value
                              }
                              alt="Logo"
                              className="max-h-32"
                            />
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              document
                                .getElementById("site-logo-input")
                                ?.click();
                            }}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {t('admin.settings.uploadSiteLogo')}
                          </button>
                          <input
                            id="site-logo-input"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  handleChange(
                                    "site_logo",
                                    event.target.result as string,
                                  );
                                  toast({
                                    title: "Logo updated",
                                    description:
                                      "Remember to save changes when you're done",
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Recommended: PNG or SVG with transparent background,
                            max 5MB
                          </p>
                        </div>
                      </div>

                      {/* Hero Background */}
                      <div className="border rounded-md p-5 shadow-sm">
                        <h3 className={`text-lg font-bold mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('admin.settings.heroBackground')}
                        </h3>

                        {settings.find((s) => s.key === "hero_background")
                          ?.value && (
                          <div className="mb-4 p-3 bg-gray-50 border rounded">
                            <img
                              src={
                                settings.find(
                                  (s) => s.key === "hero_background",
                                )?.value
                              }
                              alt="Background"
                              className="w-full h-40 object-cover rounded"
                            />
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              document.getElementById("hero-bg-input")?.click();
                            }}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {t('admin.settings.uploadBackgroundImage')}
                          </button>
                          <input
                            id="hero-bg-input"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  handleChange(
                                    "hero_background",
                                    event.target.result as string,
                                  );
                                  toast({
                                    title: "Background updated",
                                    description:
                                      "Remember to save changes when you're done",
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Recommended: High-quality landscape image, max 5MB
                          </p>
                        </div>
                      </div>

                      {/* Favicon */}
                      <div className="border rounded-md p-5 shadow-sm">
                        <h3 className={`text-lg font-bold mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                          {t('admin.settings.websiteFavicon')}
                        </h3>

                        {settings.find((s) => s.key === "company_favicon")
                          ?.value && (
                          <div className="mb-4 p-3 bg-gray-50 border rounded flex justify-center">
                            <img
                              src={
                                settings.find(
                                  (s) => s.key === "company_favicon",
                                )?.value
                              }
                              alt="Favicon"
                              className="w-16 h-16"
                            />
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              document.getElementById("favicon-input")?.click();
                            }}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {t('admin.settings.uploadFavicon')}
                          </button>
                          <input
                            id="favicon-input"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  handleChange(
                                    "company_favicon",
                                    event.target.result as string,
                                  );
                                  toast({
                                    title: "Favicon updated",
                                    description:
                                      "Remember to save changes when you're done",
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Recommended: Square image (32×32px or 64×64px), PNG
                            or ICO format
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Other theme settings */}
                    {categorizedSettings.theme
                      .filter(
                        (s) =>
                          ![
                            "site_logo",
                            "hero_background",
                            "company_favicon",
                          ].includes(s.key),
                      )
                      .map((setting) => (
                        <div key={setting.key} className="space-y-2">
                          <Label
                            htmlFor={setting.key}
                            className="text-sm font-medium"
                          >
                            {setting.key}
                          </Label>
                          <SettingInput
                            setting={{
                              ...setting,
                              value:
                                updatedSettings[setting.key] !== undefined
                                  ? updatedSettings[setting.key]
                                  : setting.value,
                            }}
                            onChange={handleChange}
                            disabled={isUpdatingSettings}
                          />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "contact" && (
              <SettingSection
                title={t('admin.settings.contactPageSettings')}
                description={t('admin.settings.contactPageDescription')}
                icon={<Phone className="h-5 w-5" />}
                settings={categorizedSettings.contact}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "images" && (
              <SettingSection
                title={t('admin.settings.imageSettings')}
                description={t('admin.settings.imageSettingsDescription')}
                icon={<ImageIcon className="h-5 w-5" />}
                settings={categorizedSettings.images}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "seo" && (
              <SettingSection
                title={t('admin.settings.seoSettings')}
                description={t('admin.settings.seoDescription')}
                icon={<Search className="h-5 w-5" />}
                settings={categorizedSettings.seo}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "social" && (
              <SettingSection
                title={t('admin.settings.socialMediaIntegration')}
                description={t('admin.settings.socialMediaDescription')}
                icon={<Share2 className="h-5 w-5" />}
                settings={categorizedSettings.social}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "features" && (
              <SettingSection
                title={t('admin.settings.platformFeatures')}
                description={t('admin.settings.platformFeaturesDescription')}
                icon={<ToggleLeft className="h-5 w-5" />}
                settings={categorizedSettings.features}
                updatedSettings={updatedSettings}
                setUpdatedSettings={setUpdatedSettings}
                isPending={isUpdatingSettings}
              />
            )}

            {activeTab === "account" && (
              <div className="space-y-6">
                <SettingSection
                  title={t('admin.settings.accountSettings')}
                  description={t('admin.settings.accountSettingsDescription')}
                  icon={<User className="h-5 w-5" />}
                  settings={categorizedSettings.account}
                  updatedSettings={updatedSettings}
                  setUpdatedSettings={setUpdatedSettings}
                  isPending={isUpdatingSettings}
                />

                <ChangePasswordForm />

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <LogOut className="h-5 w-5 text-destructive" />
                      <div>
                        <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.logout')}</CardTitle>
                        <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>
                          {t('admin.settings.signOutAdminPanel')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm text-muted-foreground mb-4 ${isRtl ? 'font-arabic text-right' : ''}`}>
                      {t('admin.settings.logoutInstructions')}
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {logoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {t('admin.settings.logout')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "new" && (
              <Card>
                <CardHeader>
                  <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.addNewSetting')}</CardTitle>
                  <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.createNewSystemSetting')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="setting-key" className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.settingKey')}</Label>
                    <Input
                      id="setting-key"
                      placeholder={t('admin.settings.settingKeyPlaceholder')}
                      value={newSettingKey}
                      onChange={(e) => setNewSettingKey(e.target.value)}
                      disabled={isCreatingSetting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setting-type" className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.settingType')}</Label>
                    <select
                      id="setting-type"
                      className="w-full p-2 border rounded-md bg-background"
                      value={newSettingType}
                      onChange={(e) =>
                        setNewSettingType(
                          e.target.value as (typeof settingTypes)[number],
                        )
                      }
                      disabled={isCreatingSetting}
                    >
                      {settingTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setting-value" className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.settings.settingValue')}</Label>
                    {newSettingType === "boolean" ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="setting-value"
                          checked={newSettingValue === "true"}
                          onCheckedChange={(checked) =>
                            setNewSettingValue(checked ? "true" : "false")
                          }
                          disabled={isCreatingSetting}
                        />
                        <Label htmlFor="setting-value" className={isRtl ? 'font-arabic' : ''}>{t('admin.settings.enabled')}</Label>
                      </div>
                    ) : newSettingType === "json" ||
                      newSettingType === "text" ? (
                      <Textarea
                        id="setting-value"
                        placeholder="Enter value"
                        value={newSettingValue}
                        onChange={(e) => setNewSettingValue(e.target.value)}
                        disabled={isCreatingSetting}
                        className={
                          newSettingType === "json" ? "font-mono text-sm" : ""
                        }
                      />
                    ) : (
                      <Input
                        id="setting-value"
                        type={
                          newSettingType === "number"
                            ? "number"
                            : newSettingType === "email"
                              ? "email"
                              : "text"
                        }
                        placeholder="Enter value"
                        value={newSettingValue}
                        onChange={(e) => setNewSettingValue(e.target.value)}
                        disabled={isCreatingSetting}
                      />
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleAddSetting}
                    disabled={!newSettingKey.trim() || isCreatingSetting}
                    className="w-full sm:w-auto"
                  >
                    {isCreatingSetting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t('admin.settings.addSetting')}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
