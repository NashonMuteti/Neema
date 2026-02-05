"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markUserThemeOverride } from "@/components/SystemThemeProvider";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  const chooseTheme = React.useCallback(
    (theme: string) => {
      // Mark as an explicit user choice so Admin → General default theme doesn't override it.
      markUserThemeOverride();
      setTheme(theme);
    },
    [setTheme]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => chooseTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => chooseTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => chooseTheme("system")}>System</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => chooseTheme("blue")}>Blue Theme</DropdownMenuItem>
        <DropdownMenuItem onClick={() => chooseTheme("green")}>Green Theme</DropdownMenuItem>
        <DropdownMenuItem onClick={() => chooseTheme("purple")}>Purple Theme</DropdownMenuItem>
        <DropdownMenuItem onClick={() => chooseTheme("orange")}>Orange Theme</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}