import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { getAuthToken, saveAuthToken, removeAuthToken } from "@/lib/authUtils";

// Redefine schemas for login and register
const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Username or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthResponse = {
  user: Omit<User, "password">;
  token: string;
};

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof insertUserSchema>;

type AuthContextType = {
  user: Omit<User, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<User, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<
    Omit<User, "password">,
    Error,
    RegisterData
  >;
  /**
   * Manually refetch the user data
   */
  refetch: () => Promise<any>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  // Get current user using the JWT token stored in localStorage
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<Omit<User, "password"> | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Check if token exists on mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      queryClient.setQueryData(["/api/user"], null);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data: AuthResponse = await res.json();

      // Store JWT token in localStorage using utility function
      saveAuthToken(data.token);

      return data.user;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
      
      // Only show success message if fully verified
      if (userData.isEmailVerified && userData.isPhoneVerified && userData.kycStatus === "approved") {
        toast({
          title: t('alerts.auth.loginSuccess'),
          description: t('alerts.auth.loginWelcome', { name: userData.fullName }),
        });
      }
      
      // Refetch user data to ensure we have the latest
      refetch();
    },
    onError: (error: Error) => {
      // Clear any existing token on login failure
      removeAuthToken();

      toast({
        title: t('alerts.auth.loginFailed'),
        description: error.message || t('alerts.auth.invalidCredentials'),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      const data: AuthResponse = await res.json();

      // Store JWT token in localStorage using utility function
      saveAuthToken(data.token);

      return data.user;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: t('alerts.auth.registrationSuccess'),
        description: t('alerts.auth.registrationWelcome'),
      });
      // Refetch user data to ensure we have the latest
      refetch();
    },
    onError: (error: Error) => {
      // Clear any existing token on registration failure
      removeAuthToken();

      toast({
        title: t('alerts.auth.registrationFailed'),
        description: error.message || t('alerts.auth.registrationFailed'),
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // We don't need to call an API endpoint with JWT auth since the token is stored client-side
      // Just remove the token from localStorage using utility function
      removeAuthToken();
    },
    onSuccess: () => {
      // Update client-side state
      queryClient.setQueryData(["/api/user"], null);

      toast({
        title: t('alerts.auth.loggedOut'),
        description: t('alerts.auth.loggedOutDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('alerts.auth.logoutFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
