"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

const availableCurrencies = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "KES", label: "Kenyan Shilling (KSh)" },
  { value: "TZS", label: "Tanzania Shilling (Tsh)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
];

const SystemCurrencySettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency, setCurrency, isLoading: settingsLoading } = useSystemSettings(); // Use currency and setCurrency from context

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageSystemCurrency = currentUserPrivileges.includes("Manage System Currency");

  // Local state to hold the selected value before saving to context/backend
  const [localCurrencyCode, setLocalCurrencyCode] = React.useState(currency.code);

  React.useEffect(() => {
    setLocalCurrencyCode(currency.code);
  }, [currency.code]);

  const handleSaveCurrency = async () => {
    await setCurrency(localCurrencyCode); // Use the local state value to update context
    showSuccess(`System currency set to ${localCurrencyCode} successfully!`);
    console.log("Saving system currency:", localCurrencyCode);
  };

  return (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle>System Currency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Set the default currency used throughout the application for financial transactions and reports.
        </p>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="system-currency">Default Currency</Label>
          <Select 
            value={localCurrencyCode} // Use local state for the controlled component
            onValueChange={setLocalCurrencyCode} // Update local state on change
            disabled={!canManageSystemCurrency || settingsLoading}
          >
            <SelectTrigger id="system-currency">
              <SelectValue placeholder="Select a currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Currencies</SelectLabel>
                {availableCurrencies.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSaveCurrency} disabled={!canManageSystemCurrency || settingsLoading}>
          <Save className="mr-2 h-4 w-4" /> Save Currency Setting
        </Button>
      </CardContent>
    </Card>
  );
};

export default SystemCurrencySettings;