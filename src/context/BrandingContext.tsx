"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BrandingContextType {
  brandLogoUrl: string;
  tagline: string;
  setBrandLogoUrl: (url: string) => void;
  setTagline: (tag: string) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brandLogoUrl, setBrandLogoUrl] = useState("/placeholder.svg"); // Default logo
  const [tagline, setTagline] = useState("Your cinematic tagline here."); // Default tagline

  return (
    <BrandingContext.Provider value={{ brandLogoUrl, tagline, setBrandLogoUrl, setTagline }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};