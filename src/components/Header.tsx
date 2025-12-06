"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

const Header = () => {
  const { isAdmin, toggleAdmin } = useAuth(); // Use isAdmin and toggleAdmin from AuthContext
  const { brandLogoUrl, tagline } = useBranding();

  // Placeholder for user data, will be replaced with actual user context from Supabase
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    initials: "JD",
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card shadow-sm transition-all duration-300 ease-in-out">
      <div className="flex items-center">
        <Link to="/" className="text-xl font-bold text-foreground flex items-center">
          <img src={brandLogoUrl} alt="Logo" className="h-8 w-auto mr-2" />
          Group Finance
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <LanguageSelector />
        <ThemeToggle />
        {/* Admin Toggle Button */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAdmin}>
          {isAdmin ? (
            <ToggleRight className="h-[1.2rem] w-[1.2rem] text-primary" />
          ) : (
            <ToggleLeft className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
          )}
          <span className="sr-only">Toggle Admin Mode</span>
        </Button>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Shield className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Admin Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Admin</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;