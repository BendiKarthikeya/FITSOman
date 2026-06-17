import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Define the settings interface
export interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
}

/**
 * Hook to fetch and manage application settings with short cache time
 * to ensure settings are always up to date
 */
export function useSettings() {
  const {
    data,
    isLoading,
    error,
    refetch: _refetch,
  } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
    refetchOnMount: true, // Refetch on mount, but not always
    refetchInterval: false, // Disable automatic refresh
    refetchIntervalInBackground: false, // Disable background refresh
  });

  // Create a map of settings for easy access
  const settingsMap = new Map<string, string>();
  if (data && Array.isArray(data)) {
    data.forEach((setting: Setting) => {
      settingsMap.set(setting.key, setting.value);
    });
  }

  // Getter function to access settings
  const getSetting = (key: string, defaultValue: string = ""): string => {
    return settingsMap.get(key) || defaultValue;
  };

  // Force refresh settings (standard refetch)
  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
  };

  // Force fetch - for components that need to explicitly trigger a new fetch
  // with visual feedback (adds logging for debugging)
  const forceFetch = async () => {
    console.log("[INFO] Force refreshing application settings");
    await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    await _refetch();
    console.log("[INFO] Settings refreshed with", data?.length || 0, "items");
    // Log debug information for image settings
    if (data) {
      const imageSettings = data.filter((s) => s.type === "image");
      for (const imgSetting of imageSettings) {
        console.log(
          "[DEBUG] Refreshed",
          imgSetting.key,
          "=",
          imgSetting.value || "not found",
        );
      }
    }
  };

  return {
    settings: data || [],
    settingsMap,
    getSetting,
    isLoading,
    error,
    refetch,
    forceFetch,
  };
}

// Utility to refresh settings from anywhere
export const refreshSettings = async () => {
  console.log("[INFO] Force refreshing application settings");

  // First invalidate both settings queries
  await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
  await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });

  // Then force refetch to trigger immediately
  await queryClient.refetchQueries({ queryKey: ["/api/settings"] });

  // Add a slight delay to ensure UI updates
  setTimeout(() => {
    // Do another refetch to be extra certain
    queryClient.refetchQueries({ queryKey: ["/api/settings"] });

    // Return the updated settings
    const settings = queryClient.getQueryData<Setting[]>(["/api/settings"]);
    console.log(
      "[INFO] Settings refreshed with",
      settings?.length || 0,
      "items",
    );

    // Check for image settings
    if (settings) {
      const logoSetting = settings.find((s) => s.key === "site_logo");
      console.log(
        "[DEBUG] Refreshed site_logo =",
        logoSetting?.value || "not found",
      );
    }
  }, 100);

  return true;
};
