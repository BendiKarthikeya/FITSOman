import { useLanguageContext } from "@/components/providers/language-provider";

/**
 * Custom hook for RTL-aware utilities
 */
export function useRTL() {
  const { isRtl, language } = useLanguageContext();

  // RTL-aware class helpers
  const rtlClass = {
    // Margin utilities
    ml: (value: string) => isRtl ? `mr-${value}` : `ml-${value}`,
    mr: (value: string) => isRtl ? `ml-${value}` : `mr-${value}`,
    
    // Padding utilities
    pl: (value: string) => isRtl ? `pr-${value}` : `pl-${value}`,
    pr: (value: string) => isRtl ? `pl-${value}` : `pr-${value}`,
    
    // Text alignment
    textLeft: isRtl ? 'text-right' : 'text-left',
    textRight: isRtl ? 'text-left' : 'text-right',
    
    // Border radius
    roundedL: isRtl ? 'rounded-r' : 'rounded-l',
    roundedR: isRtl ? 'rounded-l' : 'rounded-r',
    roundedTL: isRtl ? 'rounded-tr' : 'rounded-tl',
    roundedTR: isRtl ? 'rounded-tl' : 'rounded-tr',
    roundedBL: isRtl ? 'rounded-br' : 'rounded-bl',
    roundedBR: isRtl ? 'rounded-bl' : 'rounded-br',
    
    // Flexbox
    flexRow: isRtl ? 'flex flex-row-reverse' : 'flex flex-row',
    
    // Positioning
    left: (value: string) => isRtl ? `right-${value}` : `left-${value}`,
    right: (value: string) => isRtl ? `left-${value}` : `right-${value}`,
  };


  // Direction-aware transform for icons/arrows
  const directionTransform = isRtl ? 'scale-x-[-1]' : '';

  return {
    isRtl,
    language,
    rtlClass,
    directionTransform,
    dir: isRtl ? 'rtl' : 'ltr'
  };
}