import { useState, useRef, useEffect } from "react";
import { useEditMode } from "@/hooks/use-edit-mode";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Save, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useLanguageContext } from "@/components/providers/language-provider";

interface EditableTextProps {
  translationKey: string; // e.g., "home.hero.title"
  section: string; // e.g., "home"
  keyName: string; // e.g., "hero.title"
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  multiline?: boolean;
  placeholder?: string;
}

export function EditableText({
  translationKey,
  section,
  keyName,
  className,
  as: Component = "span",
  multiline = false,
  placeholder = "Enter text...",
}: EditableTextProps) {
  const { isEditMode } = useEditMode();
  const { t, i18n } = useTranslation();
  const { language } = useLanguageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentValue = t(translationKey);
  // Use the language from context to ensure consistency
  const currentLanguage = language;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const saveTranslationMutation = useMutation({
    mutationFn: async (value: string) => {
      // Only send the language being edited, not both
      const payload: any = {
        section,
        key: keyName,
      };
      
      if (currentLanguage === "ar") {
        payload.arabic = value;
      } else {
        payload.english = value;
      }
      
      const response = await apiRequest("POST", "/api/admin/translations", payload);
      return response.json();
    },
    onSuccess: async (data) => {
      // Update i18n resources directly
      const translation = data.data;
      if (translation) {
        const lang = currentLanguage;
        const translationObj = i18n.getResourceBundle(lang, "translation") || {};
        
        // Deep clone to avoid mutating the original
        const updatedTranslations = JSON.parse(JSON.stringify(translationObj));
        
        // Update the nested object (e.g., home.hero.title)
        const keys = translationKey.split(".");
        let current = updatedTranslations;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        // Only update the value for the current language
        if (currentLanguage === "ar") {
          current[keys[keys.length - 1]] = translation.arabic || current[keys[keys.length - 1]];
        } else {
          current[keys[keys.length - 1]] = translation.english || current[keys[keys.length - 1]];
        }
        
        // Update i18n resources (merge: true, deep: true)
        i18n.addResourceBundle(lang, "translation", updatedTranslations, true, true);
      }
      
      // Invalidate and refetch translations query to reload from database
      // This ensures all users (including the admin) see the updated translation
      await queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      await queryClient.refetchQueries({ queryKey: ["/api/translations"] });
      
      setIsEditing(false);
      setIsSaving(false);
      toast({
        title: "Saved",
        description: "Translation updated successfully. Changes are now visible to all users.",
      });
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Error",
        description: error.message || "Failed to save translation",
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (isEditMode && !isEditing) {
      setEditedValue(currentValue);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editedValue.trim() !== currentValue) {
      setIsSaving(true);
      saveTranslationMutation.mutate(editedValue.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(currentValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditMode) {
    // Normal display mode
    return <Component className={className}>{currentValue}</Component>;
  }

  if (isEditing) {
    // Editing mode
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <div className="relative group inline-block w-full">
        <InputComponent
          ref={inputRef as any}
          value={editedValue}
          onChange={(e) => setEditedValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full px-2 py-1 border-2 border-accent-gold rounded bg-white/95 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-gold",
            multiline && "min-h-[100px] resize-y",
            className
          )}
          placeholder={placeholder}
        />
        <div className="absolute -top-10 right-0 flex gap-1 z-10">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode but not editing - show clickable text
  return (
    <Component
      className={cn(
        "cursor-pointer hover:bg-accent-gold/20 hover:outline hover:outline-2 hover:outline-accent-gold hover:outline-dashed rounded px-1 transition-all",
        className
      )}
      onClick={handleClick}
      title="Click to edit"
    >
      {currentValue}
    </Component>
  );
}

