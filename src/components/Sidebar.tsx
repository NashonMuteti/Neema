"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings } from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Project Accounts",
    href: "/projects",
    icon: DollarSign,
  },
  {
    name: "Petty Cash",
    href: "/petty-cash",
    icon: Wallet,
  },
  {
    name: "User Profile",
    href: "/profile",
    icon: Users,
  },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 ease-in-out",
              location.pathname === item.href && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;