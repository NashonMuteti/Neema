"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface SystemSettingsContextType {
  currency: CurrencyInfo;
  defaultTheme: string; // New: Default theme
  setCurrency: (code: string) => Promise<void>;
  setDefaultTheme: (theme: string) => Promise<void>; // New: Setter for default theme
  isLoading: boolean;
}

const currencyMap: Record<string, string> = {
  "USD": "$",
  "EUR": "€",
  "GBP": "£",
  "JPY": "¥",
  "KES": "KSh",
  "TZS": "Tsh",
  "CAD": "C$",
  "AUD": "A$",
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyInfo>({ code: "USD", symbol: "$" });
  const [defaultTheme, setDefaultThemeState] = useState("system"); // New: Default theme state
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['default_currency_code', 'default_theme']); // Fetch both settings

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error fetching system settings:", error);
      showError("Failed to load system settings.");
    } else if (data) {
      const settingsMap = new Map(data.map(item => [item.key, item.value]));
      const fetchedCurrencyCode = settingsMap.get('default_currency_code') || 'USD';
      setCurrencyState({ code: fetchedCurrencyCode, symbol: currencyMap[fetchedCurrencyCode] || "$" });
      setDefaultThemeState(settingsMap.get('default_theme') || 'system'); // Set fetched default theme
    } else {
      // If no setting found, insert defaults
      const { error: insertError } = await supabase
        .from('settings')
        .insert([
          { key: 'default_currency_code', value: 'USD' },
          { key: 'default_theme', value: 'system' }
        ]);
      
      if (insertError) {
        console.error("Error inserting default settings:", insertError);
        showError("Failed to set default system settings.");
      } else {
        setCurrencyState({ code: 'USD', symbol: '$' });
        setDefaultThemeState('system');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: string, value: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      console.error(`Error updating ${key} setting:`, error);
      showError(`Failed to update ${key}.`);
      setIsLoading(false);
      return false;
    }
    setIsLoading(false);
    return true;
  };

  const setCurrency = async (code: string) => {
    if (await updateSetting('default_currency_code', code)) {
      setCurrencyState({ code, symbol: currencyMap[code] || "$" });
    }
  };

  const setDefaultTheme = async (theme: string) => {
    if (await updateSetting('default_theme', theme)) {
      setDefaultThemeState(theme);
    }
  };

  return (
    <SystemSettingsContext.Provider value={{ currency, defaultTheme, setCurrency, setDefaultTheme, isLoading }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};