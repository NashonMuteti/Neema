"use client";

import React from "react";
import AuthForm from "@/components/AuthForm"; // Import the new AuthForm

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground transition-all duration-300 ease-in-out">
      <div className="bg-card p-8 rounded-lg shadow-xl border w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-primary-foreground">
          Welcome to Group Finance
        </h1>
        <p className="text-muted-foreground">
          Sign in or create an account to manage your cinematic financial contributions.
        </p>
        <AuthForm /> {/* Use the new AuthForm component */}
      </div>
    </div>
  );
};

export default LoginPage;