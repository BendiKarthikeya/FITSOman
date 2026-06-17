import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

// Schema for password change form validation
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function ChangePasswordForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/change-password",
        data,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      return response.json();
    },
    onSuccess: () => {
      setStatus("success");
      toast({
        title: t("admin.passwordChangedSuccessTitle"), // Assuming this key exists in translations
        description: t("admin.passwordChangedSuccessDescription"), // Assuming this key exists in translations
      });
      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Reset the success status after 3 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    },
    onError: (error: Error) => {
      setStatus("error");
      setErrorMessage(
        error.message || "Failed to change password. Please try again.",
      );
      toast({
        title: t("admin.passwordChangedErrorTitle"), // Assuming this key exists in translations
        description:
          error.message || t("admin.passwordChangedErrorDescription"), // Assuming this key exists in translations
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PasswordChangeFormValues) => {
    setStatus("idle");
    setErrorMessage(null);

    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.changePasswordTitle")}</CardTitle>
        <CardDescription>
          {t("admin.changePasswordDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "success" && (
          <Alert className="mb-4">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>{t("admin.passwordUpdatedTitle")}</AlertTitle>
            <AlertDescription>
              {t("admin.passwordUpdatedDescription")}
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("admin.errorTitle")}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.currentPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.newPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.confirmPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  {t("admin.updating")}
                </>
              ) : (
                t("admin.changePassword")
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>{t("admin.passwordSecurityRequirements")}</p>
      </CardFooter>
    </Card>
  );
}
