"use client";

import React from "react";
import AuthForm from "@/components/AuthForm"; // Import the new AuthForm component

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground transition-all duration-300 ease-in-out">
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-primary-foreground">
          Welcome to Group Finance
        </h1>
        <p className="text-muted-foreground">
          Sign in to manage your cinematic financial contributions.
        </p>
        <AuthForm /> {/* Render the new AuthForm component */}
      </div>
    </div>
  );
};

export default LoginPage;