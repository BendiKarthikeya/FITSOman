import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { userRoles } from "@shared/schema";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Shield, Users, MessageSquare, HeadphonesIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

// Login form schema - accepts username or email
const loginFormSchema = z.object({
  emailOrUsername: z.string().min(1, "Please enter your email or username"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

// Registration form schema with comprehensive validation
const registerFormSchema = insertUserSchema
  .extend({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ),
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters"),
    phone: z.string().optional(),
    company: z
      .string()
      .max(100, "Company name must be less than 100 characters")
      .optional(),
    position: z
      .string()
      .max(100, "Position must be less than 100 characters")
      .optional(),
    location: z
      .string()
      .max(100, "Location must be less than 100 characters")
      .optional(),
    bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const { t } = useTranslation();
  
  // Check URL parameters - Default to registration flow
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "register";
  const termsAccepted = urlParams.get("terms") === "accepted";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Login form - initialize hooks BEFORE any early returns
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
      rememberMe: false,
    },
  });

  // Registration form - initialize hooks BEFORE any early returns
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "entrepreneur",
      company: "",
      position: "",
      location: "",
      phone: "",
      bio: "",
      termsAccepted: !!termsAccepted,
    },
  });

  // Redirect if user is already logged in - AFTER all hooks are initialized
  if (user) {
    // Check verification status and redirect to appropriate step
    if (!user.isEmailVerified) {
      navigate("/verification/email");
    } else if (!user.isPhoneVerified) {
      navigate("/verification/phone");
    } else if (user.kycStatus === "rejected" || user.kycStatus === "none") {
      navigate("/verification/kyc-docs");
    } else if (user.kycStatus === "pending") {
      navigate("/verification/waiting");
    } else {
      // Fully verified - go to dashboard
      navigate("/dashboard");
    }
    return null;
  }

  // Login form submission with fallback
  const onLoginSubmit = (data: LoginFormValues) => {
    // Use the standard login mutation
    loginMutation.mutate(
      {
        emailOrUsername: data.emailOrUsername,
        password: data.password,
      },
      {
        onSuccess: async (userData) => {
          // Wait a moment for the user session to be established
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check verification status and redirect to appropriate step
          if (!userData.isEmailVerified) {
            navigate("/verification/email");
          } else if (!userData.isPhoneVerified) {
            navigate("/verification/phone");
          } else if (userData.kycStatus === "rejected" || userData.kycStatus === "none") {
            navigate("/verification/kyc-docs");
          } else if (userData.kycStatus === "pending") {
            navigate("/verification/waiting");
          } else {
            // Fully verified - go to dashboard
            navigate("/dashboard");
          }
        },
      },
    );
  };

  // Registration form submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Remove confirmPassword and termsAccepted from data before sending to API
    const { confirmPassword, termsAccepted, ...registrationData } = data;

    registerMutation.mutate(registrationData, {
      onSuccess: async () => {
        // Wait a moment for the user session to be established
        await new Promise(resolve => setTimeout(resolve, 100));
        // Redirect to verification flow instead of homepage
        navigate("/verification/email");
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-6 bg-neutral-100">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Main Auth Forms - Takes 2/3 of space on large screens */}
            <div className="lg:col-span-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger 
                    value="register" 
                    className="transition-all duration-300 ease-in-out data-[state=active]:scale-[1.02]"
                  >
                    {t("auth.register.title")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="login"
                    className="transition-all duration-300 ease-in-out data-[state=active]:scale-[1.02]"
                  >
                    {t("auth.login.title")}
                  </TabsTrigger>
                </TabsList>

                {/* Registration Form - Primary Flow */}
                <TabsContent 
                  value="register"
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                >
                  <Card className="transition-all duration-300 ease-in-out hover:shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-center">{t("auth.register.title")}</CardTitle>
                      <CardDescription className="text-center">
                        {t("auth.register.subtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <Form {...registerForm}>
                        <form
                          onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                          className="space-y-3"
                        >
                          <FormField
                            control={registerForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("auth.register.fullNameLabel")}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={t("auth.register.fullNamePlaceholder")}
                                    {...field}
                                    className="transition-all duration-300 focus:scale-[1.02]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={registerForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.usernameLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t("auth.register.usernamePlaceholder")}
                                      {...field}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.emailLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="email"
                                      placeholder={t("auth.register.emailPlaceholder")}
                                      {...field}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={registerForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.passwordLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="password"
                                      placeholder={t("auth.register.passwordPlaceholder")}
                                      {...field}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.confirmPasswordLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="password"
                                      placeholder={t("auth.register.confirmPasswordPlaceholder")}
                                      {...field}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={registerForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("auth.register.roleLabel")}</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="transition-all duration-300 focus:scale-[1.02]">
                                      <SelectValue placeholder={t("auth.register.rolePlaceholder")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {userRoles.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        {t(`auth.register.roles.${role}`)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={registerForm.control}
                              name="company"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.companyLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t("auth.register.companyPlaceholder")}
                                      {...field}
                                      value={field.value || ""}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="position"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.positionLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t("auth.register.positionPlaceholder")}
                                      {...field}
                                      value={field.value || ""}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={registerForm.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.locationLabel")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t("auth.register.locationPlaceholder")}
                                      {...field}
                                      value={field.value || ""}
                                      className="transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.register.phoneLabel")}</FormLabel>
                                  <FormControl>
                                    <PhoneInput
                                      placeholder={t("auth.register.phonePlaceholder")}
                                      value={field.value || undefined}
                                      onChange={field.onChange}
                                      defaultCountry="OM"
                                      international
                                      countryCallingCodeEditable={false}
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 focus:scale-[1.02]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={registerForm.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("auth.register.bioLabel")}</FormLabel>
                                <FormControl>
                                  <textarea
                                    placeholder={t("auth.register.bioPlaceholder")}
                                    {...field}
                                    value={field.value || ""}
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-300 focus:scale-[1.02]"
                                    rows={2}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="termsAccepted"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>
                                    {t("auth.register.acceptTermsPrefix")}{" "}
                                    <button
                                      type="button"
                                      onClick={() => navigate("/terms")}
                                      className="text-primary hover:underline"
                                    >
                                      {t("auth.register.termsAndConditions")}
                                    </button>
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <div className="mr-2 w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                Creating your account...
                              </>
                            ) : (
                              <>
                                {t("auth.register.submitButton")}
                                <div className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</div>
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="pt-4 pb-4">
                      <div className="text-center w-full space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {t("auth.register.hasAccount")}
                        </div>
                        <button
                          onClick={() => setActiveTab("login")}
                          className="text-primary font-medium hover:underline transition-all duration-300 hover:scale-105"
                        >
                          {t("auth.register.signIn")}
                        </button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>

                {/* Login Form - Secondary Option */}
                <TabsContent 
                  value="login"
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                >
                  <Card className="transition-all duration-300 ease-in-out hover:shadow-lg border-primary/20">
                    <CardHeader className="pb-4">
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-in zoom-in-50 duration-700">
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <CardTitle className="text-center">{t("auth.login.title")}</CardTitle>
                      <CardDescription className="text-center">
                        Already have an account? Welcome back!
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <Form {...loginForm}>
                        <form
                          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                          className="space-y-3"
                        >
                          <FormField
                            control={loginForm.control}
                            name="emailOrUsername"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("auth.login.emailOrUsernameLabel")}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={t("auth.login.emailOrUsernamePlaceholder")}
                                    {...field}
                                    className="transition-all duration-300 focus:scale-[1.02]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("auth.login.passwordLabel")}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder={t("auth.login.passwordPlaceholder")}
                                    {...field}
                                    className="transition-all duration-300 focus:scale-[1.02]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={loginForm.control}
                            name="rememberMe"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{t("auth.login.rememberMe")}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <div className="mr-2 w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                {t("auth.login.signingIn")}
                              </>
                            ) : (
                              <>
                                {t("auth.login.submitButton")}
                                <div className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</div>
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="pt-4 pb-4">
                      <div className="text-center w-full space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {t("auth.login.newToTeejarti")}
                        </div>
                        <button
                          onClick={() => setActiveTab("register")}
                          className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all duration-300 hover:scale-105 hover:shadow-md group"
                        >
                          {t("auth.login.createAccount")}
                          <div className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</div>
                        </button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Success Stories Side Panel */}
            <div className="hidden lg:block">
              <Card className="animate-in fade-in-0 slide-in-from-right-2 duration-700 sticky top-6">
                <CardHeader className="pb-4 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 animate-in zoom-in-50 duration-1000 delay-500">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Join the Network</CardTitle>
                  <CardDescription>
                    Connect with business leaders across Oman and the GCC region
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 animate-in slide-in-from-right-2 duration-700 delay-700">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium">Secure Verification</p>
                      <p className="text-xs text-muted-foreground">Complete KYC process for trusted connections</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 animate-in slide-in-from-right-2 duration-700 delay-1000">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium">Business Matching</p>
                      <p className="text-xs text-muted-foreground">AI-powered connections with relevant partners</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 animate-in slide-in-from-right-2 duration-700 delay-[1300ms]">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium">Growth Support</p>
                      <p className="text-xs text-muted-foreground">Access to funding and mentorship opportunities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}