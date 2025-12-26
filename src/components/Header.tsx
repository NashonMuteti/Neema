"use client";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Shield } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useViewingMember } from "@/context/ViewingMemberContext";
import { supabase } from '@/integrations/supabase/client';

const Header = () => {
  const { currentUser, isLoading } = useAuth();
  const { brandLogoUrl, headerTitle } = useBranding(); // Use headerTitle from branding context
  const { viewingMemberName } = useViewingMember();
  
  // Determine if the current user is an admin based on their role
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener in AuthContext will handle state update and redirection
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b-2 border-yellow-500 bg-sky-blue-header shadow-sm transition-all duration-300 ease-in-out">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading header...
        </div>
      ) : !currentUser ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Please log in.
        </div>
      ) : (
        <>
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-foreground flex items-center">
              <img src={brandLogoUrl} alt="Logo" className="h-8 w-auto mr-2" />
              {headerTitle} {/* Use dynamic headerTitle */}
              {viewingMemberName && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {" - " + viewingMemberName}
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <ThemeToggle />
            {/* Admin Menu - only visible if the user's role is 'Admin' or 'Super Admin' */}
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
                    <AvatarFallback>
                      {currentUser.name.charAt(0).toUpperCase() + (currentUser.name.split(' ')[1]?.charAt(0).toUpperCase() || '')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
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
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;