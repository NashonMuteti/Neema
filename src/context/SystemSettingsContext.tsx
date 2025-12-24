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
  setCurrency: (code: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'default_currency_code')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error fetching system settings:", error);
      showError("Failed to load system settings.");
    } else if (data) {
      const code = data.value;
      setCurrencyState({ code, symbol: currencyMap[code] || "$" });
    } else {
      // If no setting found, insert default
      const { error: insertError } = await supabase
        .from('settings')
        .insert({ key: 'default_currency_code', value: 'USD' })
        .select('key, value')
        .single();
      
      if (insertError) {
        console.error("Error inserting default currency setting:", insertError);
        showError("Failed to set default currency.");
      } else {
        setCurrencyState({ code: 'USD', symbol: '$' });
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const setCurrency = async (code: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('settings')
      .update({ value: code })
      .eq('key', 'default_currency_code');

    if (error) {
      console.error("Error updating currency setting:", error);
      showError("Failed to update system currency.");
    } else {
      setCurrencyState({ code, symbol: currencyMap[code] || "$" });
    }
    setIsLoading(false);
  };

  return (
    <SystemSettingsContext.Provider value={{ currency, setCurrency, isLoading }}>
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