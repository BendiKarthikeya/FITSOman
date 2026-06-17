import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { scrollToTop } from "@/hooks/use-scroll-to-top";

interface BackToTopButtonProps {
  showAfter?: number; // Show button after scrolling this many pixels
  className?: string;
}

export function BackToTopButton({ 
  showAfter = 400, 
  className = "" 
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > showAfter) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, [showAfter]);

  const handleClick = () => {
    scrollToTop("smooth");
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      className={`fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full shadow-lg 
                  bg-primary hover:bg-primary/90 text-primary-foreground
                  transition-all duration-300 ease-in-out
                  hover:scale-110 hover:shadow-xl ${className}`}
      size="icon"
      aria-label="Back to top"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
}