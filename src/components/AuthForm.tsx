"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";

const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!supabase) {
      showError("Supabase is not configured. Cannot sign in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      console.error("Error signing in:", error.message);
    } else {
      showSuccess("Signed in successfully!");
      // AuthContext will handle navigation
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!supabase) {
      showError("Supabase is not configured. Cannot sign up.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      console.error("Error signing up:", error.message);
    } else {
      showSuccess("Sign up successful! Please check your email to confirm your account.");
    }
    setLoading(false);
  };

  const isSupabaseConfigured = !!supabase;

  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={!isSupabaseConfigured || loading}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={!isSupabaseConfigured || loading}
        />
      </div>
      {!isSupabaseConfigured && (
        <p className="text-red-500 text-sm">
          Supabase is not configured. Please set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file to enable authentication.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          onClick={handleSignIn}
          className="flex-1 py-6 text-lg"
          disabled={!isSupabaseConfigured || loading}
        >
          {loading ? "Signing In..." : "Sign In"}
        </Button>
        <Button
          type="submit"
          onClick={handleSignUp}
          variant="outline"
          className="flex-1 py-6 text-lg"
          disabled={!isSupabaseConfigured || loading}
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </Button>
      </div>
    </form>
  );
};

export default AuthForm;