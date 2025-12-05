"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings, BarChart2, FileText, Handshake } from "lucide-react"; // Added Handshake icon

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
    name: "Pledges", // New item
    href: "/pledges",
    icon: Handshake, // Icon for pledges
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
  },
  {
    name: "Reports",
    type: "heading",
  },
  {
    name: "Member Contributions",
    href: "/reports/member-contributions",
    icon: BarChart2,
  },
  {
    name: "Petty Cash Report",
    href: "/reports/petty-cash",
    icon: FileText,
  },
  {
    name: "Pledge Report", // New report
    href: "/reports/pledges",
    icon: FileText, // Using FileText for reports, can be changed
  },
  {
    name: "My Settings", // Renamed from User Profile
    href: "/settings", // New path for personal settings
    icon: Settings,
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