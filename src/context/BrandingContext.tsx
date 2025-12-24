"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BrandingContextType {
  brandLogoUrl: string;
  tagline: string;
  headerTitle: string; // New: Customizable header title
  setBrandLogoUrl: (url: string) => void;
  setTagline: (tag: string) => void;
  setHeaderTitle: (title: string) => void; // New: Setter for header title
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brandLogoUrl, setBrandLogoUrl] = useState("/placeholder.svg"); // Default logo
  const [tagline, setTagline] = useState("Your cinematic tagline here."); // Default tagline
  const [headerTitle, setHeaderTitle] = useState("Group Finance"); // New: Default header title

  return (
    <BrandingContext.Provider value={{ brandLogoUrl, tagline, headerTitle, setBrandLogoUrl, setTagline, setHeaderTitle }}>
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