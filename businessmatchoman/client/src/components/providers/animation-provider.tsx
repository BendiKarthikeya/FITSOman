import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";

interface AnimationProviderProps {
  children: ReactNode;
}

/**
 * AnimationProvider
 * A wrapper component that enables smooth transitions between routes
 * using Framer Motion's AnimatePresence
 */
export function AnimationProvider({ children }: AnimationProviderProps) {
  const [location] = useLocation();
  const [currentPath, setCurrentPath] = useState(location);

  // Update the current path when location changes  
  useEffect(() => {
    setCurrentPath(location);
  }, [location]);

  return (
    <AnimatePresence mode="wait">
      <div key={currentPath} className="w-full">
        {children}
      </div>
    </AnimatePresence>
  );
}
