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

export function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = React.useState("en"); // Default to English

  // In a real application, this would trigger a change in i18n library
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    console.log("Language changed to:", value);
    // Here you would typically update your i18n library's language setting
  };

  return (
    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[120px] h-8">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Languages</SelectLabel>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Español</SelectItem>
          <SelectItem value="fr">Français</SelectItem>
          <SelectItem value="de">Deutsch</SelectItem>
          <SelectItem value="sw">Kiswahili</SelectItem> {/* Added Swahili */}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}