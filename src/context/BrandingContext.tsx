"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { perfMark, perfStart } from '@/utils/perf';

interface BrandingContextType {
  brandLogoUrl: string;
  tagline: string;
  headerTitle: string;
  setBrandLogoUrl: (url: string) => Promise<void>;
  setTagline: (tag: string) => Promise<void>;
  setHeaderTitle: (title: string) => Promise<void>;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brandLogoUrl, setBrandLogoUrlState] = useState("/placeholder.svg"); // Default logo
  const [tagline, setTaglineState] = useState("Your cinematic tagline here."); // Default tagline
  const [headerTitle, setHeaderTitleState] = useState("Group Finance"); // Default header title
  const [isLoading, setIsLoading] = useState(true);

  const fetchBrandingSettings = useCallback(async () => {
    const end = perfStart('BrandingContext:fetchBrandingSettings');
    setIsLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['brand_logo_url', 'tagline', 'header_title']);

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error fetching branding settings:", error);
      showError("Failed to load branding settings.");
    } else if (data) {
      const settingsMap = new Map(data.map(item => [item.key, item.value]));
      setBrandLogoUrlState(settingsMap.get('brand_logo_url') || "/placeholder.svg");
      setTaglineState(settingsMap.get('tagline') || "Your cinematic tagline here.");
      setHeaderTitleState(settingsMap.get('header_title') || "Group Finance");
    }
    setIsLoading(false);
    end({ rows: data?.length ?? 0, errorCode: error?.code });
  }, []);

  useEffect(() => {
    perfMark('BrandingContext:mount');
    fetchBrandingSettings();
  }, [fetchBrandingSettings]);

  const updateSetting = async (key: string, value: string | null) => {
    const end = perfStart(`BrandingContext:updateSetting:${key}`);
    setIsLoading(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      console.error(`Error updating ${key} setting:`, error);
      showError(`Failed to update ${key}.`);
      setIsLoading(false);
      end({ ok: false, errorCode: error.code });
      return false;
    }
    setIsLoading(false);
    end({ ok: true });
    return true;
  };

  const setBrandLogoUrl = async (url: string) => {
    if (await updateSetting('brand_logo_url', url)) {
      setBrandLogoUrlState(url);
    }
  };

  const setTagline = async (tag: string) => {
    if (await updateSetting('tagline', tag)) {
      setTaglineState(tag);
    }
  };

  const setHeaderTitle = async (title: string) => {
    if (await updateSetting('header_title', title)) {
      setHeaderTitleState(title);
    }
  };

  return (
    <BrandingContext.Provider value={{ brandLogoUrl, tagline, headerTitle, setBrandLogoUrl, setTagline, setHeaderTitle, isLoading }}>
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