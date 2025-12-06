"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings, BarChart2, FileText, Handshake, RefreshCcw, Activity, ChevronDown, FolderX, TrendingUp, TrendingDown, UserCog, CalendarDays, Banknote } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[]; // Roles required to see this item
}

interface NavHeading {
  name: string;
  type: "heading";
  requiredRoles?: string[]; // Roles required to see this heading
  children: NavItem[];
}

type SidebarItem = NavItem | NavHeading;

const navItems: SidebarItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    requiredRoles: ["Admin", "Project Manager", "Contributor"],
  },
  {
    name: "Project Accounts",
    href: "/projects",
    icon: DollarSign,
    requiredRoles: ["Admin", "Project Manager"],
  },
  {
    name: "Petty Cash",
    href: "/petty-cash",
    icon: Wallet,
    requiredRoles: ["Admin", "Project Manager"],
  },
  {
    name: "Pledges",
    href: "/pledges",
    icon: Handshake,
    requiredRoles: ["Admin", "Project Manager"],
  },
  {
    name: "Income",
    href: "/income",
    icon: TrendingUp,
    requiredRoles: ["Admin", "Project Manager"],
  },
  {
    name: "Expenditure",
    href: "/expenditure",
    icon: TrendingDown,
    requiredRoles: ["Admin", "Project Manager"],
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    requiredRoles: ["Admin", "Project Manager"],
  },
  {
    name: "Board Members",
    href: "/board-members",
    icon: UserCog,
    requiredRoles: ["Admin"], // Only Admin can see this
  },
  {
    name: "Reports",
    type: "heading",
    requiredRoles: ["Admin", "Project Manager", "Contributor"],
    children: [
      {
        name: "Member Contributions",
        href: "/reports/member-contributions",
        icon: BarChart2,
        requiredRoles: ["Admin", "Project Manager"],
      },
      {
        name: "Petty Cash Report",
        href: "/reports/petty-cash",
        icon: FileText,
        requiredRoles: ["Admin", "Project Manager"],
      },
      {
        name: "Pledge Report",
        href: "/reports/pledges",
        icon: FileText,
        requiredRoles: ["Admin", "Project Manager"],
      },
      {
        name: "Table Banking Summary",
        href: "/reports/table-banking-summary",
        icon: Banknote,
        requiredRoles: ["Admin", "Project Manager"],
      },
      {
        name: "User Activity Report",
        href: "/reports/user-activity",
        icon: Activity,
        requiredRoles: ["Admin"], // Only Admin can see this
      },
      {
        name: "Deleted Projects Report",
        href: "/reports/deleted-projects",
        icon: FolderX,
        requiredRoles: ["Admin"], // Only Admin can see this
      },
    ],
  },
  {
    name: "Actions",
    type: "heading",
    requiredRoles: ["Admin"], // Only Admin can see this heading
    children: [
      {
        name: "Initialize Balances",
        href: "/initialize-balances",
        icon: RefreshCcw,
        requiredRoles: ["Admin"], // Only Admin can see this
      },
    ],
  },
  {
    name: "My Contributions",
    href: "/my-contributions",
    icon: CalendarDays,
    requiredRoles: ["Admin", "Project Manager", "Contributor"],
  },
  {
    name: "Admin Settings",
    href: "/admin/settings",
    icon: Settings,
    requiredRoles: ["Admin"], // Only Admin can see this
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { userRoles } = useAuth(); // Use userRoles from AuthContext
  const [isReportsOpen, setIsReportsOpen] = React.useState(false);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);

  // Helper to check if user has any of the required roles
  const hasRequiredRole = (requiredRoles?: string[]) => {
    if (!requiredRoles || requiredRoles.length === 0) return true; // No roles required, so accessible
    return requiredRoles.some(role => userRoles.includes(role));
  };

  // Open reports/actions collapsible if any child route is active and user has access
  React.useEffect(() => {
    const isChildOfReports = navItems.some(item =>
      item.type === "heading" && item.name === "Reports" && item.children?.some(child => location.pathname.startsWith(child.href) && hasRequiredRole(child.requiredRoles))
    );
    if (isChildOfReports) {
      setIsReportsOpen(true);
    } else {
      setIsReportsOpen(false); // Close if no child is active
    }

    const isChildOfActions = navItems.some(item =>
      item.type === "heading" && item.name === "Actions" && item.children?.some(child => location.pathname.startsWith(child.href) && hasRequiredRole(child.requiredRoles))
    );
    if (isChildOfActions) {
      setIsActionsOpen(true);
    } else {
      setIsActionsOpen(false); // Close if no child is active
    }
  }, [location.pathname, userRoles]);


  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          if (!hasRequiredRole(item.requiredRoles)) {
            return null; // Hide item if user doesn't have required roles
          }

          if (item.type === "heading") {
            const isOpen = item.name === "Reports" ? isReportsOpen : isActionsOpen;
            const setIsOpen = item.name === "Reports" ? setIsReportsOpen : setIsActionsOpen;

            // Filter children based on user roles
            const visibleChildren = item.children.filter(child => hasRequiredRole(child.requiredRoles));

            if (visibleChildren.length === 0) {
              return null; // Hide heading if no children are visible
            }

            return (
              <Collapsible key={item.name} open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors duration-200 ease-in-out">
                  {item.name}
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-4">
                  {visibleChildren.map((child) => (
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
                  ))}
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