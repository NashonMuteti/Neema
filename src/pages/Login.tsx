"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase"; // Import as named export
import { showError } from "@/utils/toast";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";

const LoginPage = () => {
  const handleOAuthSignIn = async (provider: "google" | "github") => {
    if (!supabase) {
      showError("Supabase is not configured. Cannot sign in.");
      console.error("Supabase client is not initialized. Cannot perform OAuth sign-in.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin, // Redirects back to the app after login
      },
    });

    if (error) {
      showError(`Failed to sign in with ${provider}.`);
      console.error(`Error signing in with ${provider}:`, error.message);
    }
  };

  const isSupabaseConfigured = !!supabase;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground transition-all duration-300 ease-in-out">
      <div className="bg-card p-8 rounded-lg shadow-xl border w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-primary-foreground">
          Welcome to Group Finance
        </h1>
        <p className="text-muted-foreground">
          Sign in to manage your cinematic financial contributions.
        </p>
        {!isSupabaseConfigured && (
          <p className="text-red-500 text-sm">
            Supabase is not configured. Please set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file to enable authentication.
          </p>
        )}
        <div className="space-y-4">
          <Button
            className="w-full flex items-center justify-center gap-2 py-6 text-lg"
            onClick={() => handleOAuthSignIn("google")}
            disabled={!isSupabaseConfigured}
          >
            <GoogleIcon className="h-5 w-5" />
            Sign in with Google
          </Button>
          <Button
            className="w-full flex items-center justify-center gap-2 py-6 text-lg"
            onClick={() => handleOAuthSignIn("github")}
            disabled={!isSupabaseConfigured}
          >
            <GithubIcon className="h-5 w-5" />
            Sign in with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;