"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormData = z.infer<typeof formSchema>;

const AuthForm = () => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { handleSubmit, register, formState: { errors } } = form;

  const onSubmit = async (data: FormData) => {
    if (!supabase) {
      showError("Supabase is not configured. Cannot perform authentication.");
      console.error("Supabase client is not initialized. Cannot perform authentication.");
      return;
    }

    setIsLoading(true);
    const { email, password } = data;

    try {
      if (isSigningUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          showError(signUpError.message);
        } else if (signUpData.user) {
          showSuccess("Sign up successful! Please check your email to confirm your account.");
          setIsSigningUp(false); // Switch back to sign-in after successful sign-up
        } else {
          showSuccess("Sign up initiated. Check your email for a confirmation link.");
          setIsSigningUp(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          showError(signInError.message);
        } else {
          showSuccess("Signed in successfully!");
        }
      }
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
      console.error("Authentication error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isSupabaseConfigured = !!supabase;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{isSigningUp ? "Sign Up" : "Sign In"}</CardTitle>
        <CardDescription>
          {isSigningUp ? "Create your account to get started." : "Enter your credentials to access your account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured && (
          <p className="text-red-500 text-sm mb-4">
            Supabase is not configured. Please set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file to enable authentication.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              {...register("email")}
              disabled={!isSupabaseConfigured || isLoading}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              disabled={!isSupabaseConfigured || isLoading}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!isSupabaseConfigured || isLoading}>
            {isLoading ? "Loading..." : (isSigningUp ? "Sign Up" : "Sign In")}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {isSigningUp ? (
            <>
              Already have an account?{" "}
              <Button variant="link" onClick={() => setIsSigningUp(false)} disabled={isLoading}>
                Sign In
              </Button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Button variant="link" onClick={() => setIsSigningUp(true)} disabled={isLoading}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;