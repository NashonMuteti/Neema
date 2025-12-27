"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useTranslation } from 'react-i18next'; // New import

export function LanguageSelector() {
  const { i18n, t } = useTranslation(); // Use the useTranslation hook

  // Get the current language from i18n instance
  const selectedLanguage = i18n.language;

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value); // Change the language using i18n instance
    console.log("Language changed to:", value);
  };

  return (
    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[120px] h-8">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder={t("select_language")} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t("select_language")}</SelectLabel>
          <SelectItem value="en">{t("language_english")}</SelectItem>
          <SelectItem value="es">{t("language_spanish")}</SelectItem>
          <SelectItem value="fr">{t("language_french")}</SelectItem>
          <SelectItem value="de">{t("language_german")}</SelectItem>
          <SelectItem value="sw">{t("language_swahili")}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}