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
import { LogOut, Settings, User, Shield } from "lucide-react"; // Added Shield icon for Admin
import { ThemeToggle } from "./ThemeToggle";
import { GroupSelector } from "./GroupSelector";
import { LanguageSelector } from "./LanguageSelector"; // Import LanguageSelector

const Header = () => {
  // Placeholder for user data, will be replaced with actual user context from Supabase
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    initials: "JD",
    isAdmin: true, // Assume admin for now to show the menu
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card shadow-sm transition-all duration-300 ease-in-out">
      <div className="flex items-center">
        <Link to="/" className="text-xl font-bold text-primary-foreground flex items-center">
          <img src="/placeholder.svg" alt="Logo" className="h-8 w-auto mr-2" />
          Group Finance
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <GroupSelector />
        <LanguageSelector /> {/* Integrated LanguageSelector */}
        <ThemeToggle />
        {user.isAdmin && ( // Only show Admin menu if user is admin
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
              <Link to="/profile"> {/* Link to user's profile page */}
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings"> {/* Link to user's personal settings page */}
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