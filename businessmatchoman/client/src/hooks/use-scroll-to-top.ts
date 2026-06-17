import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Custom hook that automatically scrolls to the top of the page
 * whenever the route changes
 */
export function useScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    console.log('🔄 Route changed to:', location);
    
    // Disable browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    const forceScrollToTop = () => {
      // Use requestAnimationFrame to ensure this runs after all DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('⚡ Executing scroll reset after DOM updates');
          
          // Force scroll reset on everything
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          
          // Check actual scroll position
          const actualScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
          console.log('📊 After reset, actual scroll position:', actualScroll);
          
          // Force ALL elements to scroll to top
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            if (element instanceof HTMLElement && element.scrollTop !== undefined) {
              element.scrollTop = 0;
            }
          });
          
          // Extra aggressive final attempt
          setTimeout(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            console.log('🏁 Final scroll reset complete');
          }, 500);
        });
      });
    };
    
    // Execute the scroll reset
    forceScrollToTop();
    
  }, [location]);
}

/**
 * Function to manually scroll to top
 * Can be called from buttons or other components
 */
export function scrollToTop(behavior: "smooth" | "instant" = "smooth") {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior,
  });
}