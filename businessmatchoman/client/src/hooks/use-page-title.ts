import { useEffect } from "react";

/**
 * Custom hook to set the page title dynamically
 * @param title - The title to set for the page
 * @param baseTitle - The base title to append (defaults to "Teejarti")
 */
export function usePageTitle(title?: string, baseTitle: string = "Teejarti") {
  useEffect(() => {
    const newTitle = title ? `${title} - ${baseTitle}` : baseTitle;
    document.title = newTitle;

    // Cleanup: reset to base title when component unmounts
    return () => {
      document.title = baseTitle;
    };
  }, [title, baseTitle]);
}

/**
 * Set page title programmatically
 * @param title - The title to set
 * @param baseTitle - The base title to append (defaults to "Teejarti")
 */
export function setPageTitle(title?: string, baseTitle: string = "Teejarti") {
  const newTitle = title ? `${title} - ${baseTitle}` : baseTitle;
  document.title = newTitle;
}