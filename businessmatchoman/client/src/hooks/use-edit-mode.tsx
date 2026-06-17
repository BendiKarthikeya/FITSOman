import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "./use-auth";

type EditModeContextType = {
  isEditMode: boolean;
  toggleEditMode: () => void;
  enableEditMode: () => void;
  disableEditMode: () => void;
};

const EditModeContext = createContext<EditModeContextType | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);

  // Only allow edit mode for admins
  const canEdit = user?.role === "admin";

  const toggleEditMode = () => {
    if (canEdit) {
      setIsEditMode((prev) => !prev);
    }
  };

  const enableEditMode = () => {
    if (canEdit) {
      setIsEditMode(true);
    }
  };

  const disableEditMode = () => {
    setIsEditMode(false);
  };

  return (
    <EditModeContext.Provider
      value={{
        isEditMode: canEdit ? isEditMode : false,
        toggleEditMode,
        enableEditMode,
        disableEditMode,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  // Return safe defaults if provider is not available
  if (!context) {
    return {
      isEditMode: false,
      toggleEditMode: () => {},
      enableEditMode: () => {},
      disableEditMode: () => {},
    };
  }
  return context;
}

