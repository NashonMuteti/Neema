"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings, BarChart2, FileText, Handshake, RefreshCcw, Activity } from "lucide-react"; // Added RefreshCcw and Activity icons

// Placeholder for a privileged user check
const isAdmin = true; // This should come from user context/authentication

const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    privileged: false,
  },
  {
    name: "Project Accounts",
    href: "/projects",
    icon: DollarSign,
    privileged: false,
  },
  {
    name: "Petty Cash",
    href: "/petty-cash",
    icon: Wallet,
    privileged: false,
  },
  {
    name: "Pledges",
    href: "/pledges",
    icon: Handshake,
    privileged: false,
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    privileged: false,
  },
  {
    name: "Reports",
    type: "heading",
  },
  {
    name: "Member Contributions",
    href: "/reports/member-contributions",
    icon: BarChart2,
    privileged: false,
  },
  {
    name: "Petty Cash Report",
    href: "/reports/petty-cash",
    icon: FileText,
    privileged: false,
  },
  {
    name: "Pledge Report",
    href: "/reports/pledges",
    icon: FileText,
    privileged: false,
  },
  {
    name: "User Activity Report", // New privileged report
    href: "/reports/user-activity",
    icon: Activity,
    privileged: true,
  },
  {
    name: "Actions",
    type: "heading",
    privileged: true,
  },
  {
    name: "Initialize Balances", // New privileged action
    href: "/initialize-balances",
    icon: RefreshCcw,
    privileged: true,
  },
  {
    name: "My Settings",
    href: "/settings",
    icon: Settings,
    privileged: false,
  },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          if (item.privileged && !isAdmin) {
            return null; // Don't render if not privileged
          }
          return item.type === "heading" ? (
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
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;