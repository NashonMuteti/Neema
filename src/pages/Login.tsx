"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBranding } from '@/context/BrandingContext';

const Login: React.FC = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const { brandLogoUrl } = useBranding();

  React.useEffect(() => {
    if (!isLoading && session) {
      // User is authenticated, redirect to dashboard
      navigate('/', { replace: true });
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={brandLogoUrl} alt="Logo" className="h-12 w-auto mx-auto mb-4" />
          <CardTitle className="2xl font-bold">Welcome Back!</CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]} // Only email/password, no third-party providers unless specified
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light" // Use light theme, or dynamically set based on app theme
            redirectTo={window.location.origin + '/'} // Redirect to home after auth
            view="sign_in" // Only show the sign-in form
            localization={{
              variables: {
                sign_in: {
                  sign_up_link_text: '', // This should hide the "Don't have an account? Sign up" link
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;