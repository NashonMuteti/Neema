"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings, BarChart2, FileText } from "lucide-react"; // Added new icons

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
    name: "Members", // New item
    href: "/members",
    icon: Users,
  },
  {
    name: "Reports", // Section header
    type: "heading",
  },
  {
    name: "Member Contributions", // New report
    href: "/reports/member-contributions",
    icon: BarChart2,
  },
  {
    name: "Petty Cash Report", // New report
    href: "/reports/petty-cash",
    icon: FileText,
  },
  {
    name: "User Profile",
    href: "/profile",
    icon: Settings, // Changed icon to Settings for profile
  },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          item.type === "heading" ? (
            <h3 key={item.name} className="mt-4 mb-2 px-3 text-sm font-semibold text-muted-foreground">
              {item.name}
            </h3>
          ) : (
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
          )
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;