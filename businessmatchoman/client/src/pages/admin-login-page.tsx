import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import { ShieldAlert, Lock } from "lucide-react";

import { saveAuthToken } from "@/lib/authUtils";
import { queryClient } from "@/lib/queryClient";

// Schema for login form validation - field names must match backend expectations
const createLoginSchema = (t: (key: string) => string) => z.object({
  username: z.string().min(1, t('admin.login.usernameRequired')),
  password: z.string().min(1, t('admin.login.passwordRequired')),
});

// Define the inferred type without referencing loginSchema before it's created
type LoginFormValues = {
  username: string;
  password: string;
};

const AdminLoginPage = () => {
  const { user, isLoading, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  const [loginError, setLoginError] = useState<string | null>(null);

  const loginSchema = createLoginSchema(t);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Custom mutation for admin login
  const adminLoginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      console.log(
        "[DEBUG] Admin login attempt with username:",
        credentials.username,
      );

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        console.error(
          "[ERROR] Admin login API response not OK. Status:",
          res.status,
        );
        const errorData = await res.json();
        console.error("[ERROR] Admin login error details:", errorData);
        throw new Error(errorData.message || "Login failed");
      }

      console.log("[DEBUG] Admin login API response OK");
      const data = await res.json();
      console.log(
        "[DEBUG] Admin login success. Token length:",
        data.token?.length,
      );

      // Save token with a clear console log
      console.log("[DEBUG] Saving admin auth token to localStorage");
      saveAuthToken(data.token);
      console.log("[DEBUG] Auth token saved successfully");

      return data.user;
    },
    onSuccess: (user) => {
      // Update user data in auth context
      console.log(
        "[DEBUG] Admin login success. Updating user data in context:",
        user.id,
        user.username,
      );
      queryClient.setQueryData(["/api/user"], user);

      // Force refresh all queries that depend on authentication
      console.log("[DEBUG] Invalidating API queries after successful login");
      queryClient.invalidateQueries();

      // Redirect to admin dashboard
      toast({
        title: t('admin.login.loginSuccessful'),
        description: t('admin.login.welcomeBack'),
      });

      // Give a short delay before redirecting to ensure token is properly stored
      setTimeout(() => {
        console.log("[DEBUG] Redirecting to admin dashboard");
        setLocation("/admin");
      }, 100);
    },
    onError: (error: Error) => {
      console.error("[ERROR] Admin login mutation failed:", error.message);
      setLoginError(
        error.message || t('admin.login.loginFailed'),
      );
      toast({
        title: t('admin.login.loginFailedTitle'),
        description:
          error.message || t('admin.login.checkCredentials'),
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: LoginFormValues) => {
    setLoginError(null);
    adminLoginMutation.mutate(data);
  };

  // Redirect to admin dashboard if already logged in as admin
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md mx-auto p-4">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mx-auto mb-4" />
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user && user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <h1 className={`text-3xl font-bold ${isRtl ? 'font-arabic' : ''}`}>{t('admin.login.adminPortal')}</h1>
          <p className={`text-muted-foreground mt-2 ${isRtl ? 'font-arabic' : ''}`}>
            {t('admin.login.secureAccess')}
          </p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.login.administratorLogin')}</CardTitle>
            <CardDescription className={isRtl ? 'font-arabic text-right' : ''}>
              {t('admin.login.enterCredentials')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.login.authenticationError')}</AlertTitle>
                <AlertDescription className={isRtl ? 'font-arabic text-right' : ''}>{loginError}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.login.emailOrUsername')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('admin.login.emailPlaceholder')}
                          {...field}
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={isRtl ? 'font-arabic text-right' : ''}>{t('admin.login.password')}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('admin.login.passwordPlaceholder')}
                          {...field}
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={adminLoginMutation.isPending}
                >
                  {adminLoginMutation.isPending ? (
                    <>
                      <div className="mr-2 w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />{" "}
                      {t('admin.login.authenticating')}
                    </>
                  ) : (
                    <>
                      <Lock className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {t('admin.login.signIn')}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            <p className={isRtl ? 'font-arabic' : ''}>{t('admin.login.authorizedOnly')}</p>
          </CardFooter>
        </Card>

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            {t('admin.login.returnToSite')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
