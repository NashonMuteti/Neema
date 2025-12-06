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
import { useAuth } from "@/context/AuthContext"; // New import
import { useUserRoles } from "@/context/UserRolesContext"; // New import

const availableCurrencies = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "KES", label: "Kenyan Shilling (KSh)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
];

const SystemCurrencySettings = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
  const canManageSystemCurrency = currentUserPrivileges.includes("Manage System Currency");

  // In a real app, this would be fetched from a backend setting
  const [selectedCurrency, setSelectedCurrency] = React.useState("USD");

  const handleSaveCurrency = () => {
    // In a real app, this would send the selectedCurrency to the backend
    console.log("Saving system currency:", selectedCurrency);
    showSuccess(`System currency set to ${selectedCurrency} successfully!`);
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
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency} disabled={!canManageSystemCurrency}>
            <SelectTrigger id="system-currency">
              <SelectValue placeholder="Select a currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Currencies</SelectLabel>
                {availableCurrencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSaveCurrency} disabled={!canManageSystemCurrency}>
          <Save className="mr-2 h-4 w-4" /> Save Currency Setting
        </Button>
      </CardContent>
    </Card>
  );
};

export default SystemCurrencySettings;