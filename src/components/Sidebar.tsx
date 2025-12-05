"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings, BarChart2, FileText, Handshake, RefreshCcw, Activity, ChevronDown, FolderX, TrendingUp, TrendingDown, UserCog } from "lucide-react"; // Added UserCog icon
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"; // Import Collapsible

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
    name: "Income", // New menu item
    href: "/income",
    icon: TrendingUp,
    privileged: false,
  },
  {
    name: "Expenditure", // New menu item
    href: "/expenditure",
    icon: TrendingDown, // Using TrendingDown icon for expenditure
    privileged: false,
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    privileged: false,
  },
  {
    name: "Board Members", // New privileged menu item
    href: "/board-members",
    icon: UserCog,
    privileged: true,
  },
  {
    name: "Reports",
    type: "heading",
    privileged: false, // Heading itself doesn't need privilege, but its children might
    children: [
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
        name: "User Activity Report",
        href: "/reports/user-activity",
        icon: Activity,
        privileged: true,
      },
      {
        name: "Deleted Projects Report", // New privileged report
        href: "/reports/deleted-projects",
        icon: FolderX,
        privileged: true,
      },
    ],
  },
  {
    name: "Actions",
    type: "heading",
    privileged: true,
    children: [
      {
        name: "Initialize Balances",
        href: "/initialize-balances",
        icon: RefreshCcw,
        privileged: true,
      },
    ],
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
  const [isReportsOpen, setIsReportsOpen] = React.useState(false);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);

  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          if (item.privileged && !isAdmin) {
            return null;
          }

          if (item.type === "heading") {
            const isOpen = item.name === "Reports" ? isReportsOpen : isActionsOpen;
            const setIsOpen = item.name === "Reports" ? setIsReportsOpen : setIsActionsOpen;

            return (
              <Collapsible key={item.name} open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors duration-200 ease-in-out">
                  {item.name}
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-4">
                  {item.children?.map((child) => {
                    if (child.privileged && !isAdmin) {
                      return null;
                    }
                    return (
                      <Link
                        key={child.name}
                        to={child.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 ease-in-out",
                          location.pathname === child.href && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                        )}
                      >
                        <child.icon className="h-5 w-5" />
                        {child.name}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          } else {
            return (
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
          }
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;