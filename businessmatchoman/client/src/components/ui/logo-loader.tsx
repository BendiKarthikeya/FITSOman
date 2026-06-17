import React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

interface LogoLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showLoadingText?: boolean;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({
  className,
  size = "md",
  showText = true,
  showLoadingText = false,
}) => {
  const { language, isRtl } = useLanguage();
  const { t } = useTranslation();
  
  // Responsive text sizes - simple and clean
  const textSizeClasses = {
    sm: "text-xl sm:text-2xl",
    md: "text-3xl sm:text-4xl md:text-5xl", 
    lg: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl",
  };



  // Get the appropriate brand name based on language
  const brandName = language === "ar" ? "تيجارتي" : "TEEJARTI";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center relative",
        className,
      )}
    >
      {/* Main TEEJARTI Text */}
      {showText && (
        <div className="text-center relative z-10">
          <h1
            className={cn(
              "font-bold tracking-wider animate-pulse",
              textSizeClasses[size],
              isRtl ? "font-arabic" : "",
            )}
            style={{
              color: "#C79F3D",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              fontFamily: isRtl ? "Arial, sans-serif" : "Georgia, serif",
              fontWeight: "700",
              letterSpacing: isRtl ? "0" : "0.1em"
            }}
          >
            {brandName}
          </h1>
        </div>
      )}
      

    </div>
  );
};

// Full page loader with custom blue background
export const FullPageLoader: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "#1A3B5B" }}
    >
      <LogoLoader size="lg" showText={true} showLoadingText={false} />
    </div>
  );
};

// Inline loader for smaller spaces
export const InlineLoader: React.FC<{ text?: string }> = ({
  text,
}) => {
  const { isRtl } = useLanguage();
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center justify-center py-8">
      <LogoLoader size="sm" showText={false} />
      {text && (
        <span 
          className={cn(
            "text-sm font-medium",
            isRtl ? "mr-4 font-arabic" : "ml-4"
          )} 
          style={{ color: "#C79F3D" }}
        >
          {text}
        </span>
      )}
    </div>
  );
};