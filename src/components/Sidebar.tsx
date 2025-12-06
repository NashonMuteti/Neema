"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, DollarSign, Wallet, Users, Settings, BarChart2, FileText, Handshake, RefreshCcw, Activity, ChevronDown, FolderX, TrendingUp, TrendingDown, UserCog, CalendarDays, Banknote, ShoppingCart, Package, Scale } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[];
  type?: "item";
}

export interface NavHeading {
  name: string;
  type: "heading";
  requiredRoles?: string[];
  children: NavItem[];
}

export interface PrivilegeItem { // New interface for privilege-only items
  name: string;
  type: "privilege";
  requiredRoles?: string[]; // Who can assign this privilege (optional, for future use)
}

type SidebarItem = NavItem | NavHeading | PrivilegeItem; // Union type for all sidebar items

export const navItems: SidebarItem[] = [
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
    name: "Sales Management",
    type: "heading",
    requiredRoles: ["Admin", "Project Manager"],
    children: [
      {
        name: "Stocks",
        href: "/sales/stocks",
        icon: Package,
        requiredRoles: ["Admin", "Project Manager"],
      },
      {
        name: "Daily Sales",
        href: "/sales/daily",
        icon: ShoppingCart,
        requiredRoles: ["Admin", "Project Manager"],
      },
      {
        name: "Debts",
        href: "/sales/debts",
        icon: Scale,
        requiredRoles: ["Admin", "Project Manager"],
      },
    ],
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    requiredRoles: ["Admin", "Project Manager", "Contributor"], // Allow more roles to view the page
  },
  {
    name: "Board Members",
    href: "/board-members",
    icon: UserCog,
    requiredRoles: ["Admin"],
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
        requiredRoles: ["Admin"],
      },
      {
        name: "Deleted Projects Report",
        href: "/reports/deleted-projects",
        icon: FolderX,
        requiredRoles: ["Admin"],
      },
    ],
  },
  {
    name: "Actions",
    type: "heading",
    requiredRoles: ["Admin"],
    children: [
      {
        name: "Initialize Balances",
        href: "/initialize-balances",
        icon: RefreshCcw,
        requiredRoles: ["Admin"],
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
    requiredRoles: ["Admin"],
  },
  {
    name: "Manage Members", // This is the privilege item
    type: "privilege",
    requiredRoles: ["Admin"], // Only Admin can assign this privilege
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const [isReportsOpen, setIsReportsOpen] = React.useState(false);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isSalesManagementOpen, setIsSalesManagementOpen] = React.useState(false);

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];

  const hasRequiredRole = (requiredRoles?: string[]) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.some(role => currentUser?.role === role || currentUserPrivileges.includes(role));
  };

  React.useEffect(() => {
    const isChildOfReports = navItems.some(item =>
      (item.type === "heading" && item.name === "Reports" && item.children?.some(child => location.pathname.startsWith(child.href) && hasRequiredRole(child.requiredRoles)))
    );
    if (isChildOfReports) {
      setIsReportsOpen(true);
    } else {
      setIsReportsOpen(false);
    }

    const isChildOfActions = navItems.some(item =>
      (item.type === "heading" && item.name === "Actions" && item.children?.some(child => location.pathname.startsWith(child.href) && hasRequiredRole(child.requiredRoles)))
    );
    if (isChildOfActions) {
      setIsActionsOpen(true);
    } else {
      setIsActionsOpen(false);
    }

    const isChildOfSalesManagement = navItems.some(item =>
      (item.type === "heading" && item.name === "Sales Management" && item.children?.some(child => location.pathname.startsWith(child.href) && hasRequiredRole(child.requiredRoles)))
    );
    if (isChildOfSalesManagement) {
      setIsSalesManagementOpen(true);
    } else {
      setIsSalesManagementOpen(false);
    }
  }, [location.pathname, currentUser, currentUserPrivileges, definedRoles]);


  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          if (item.type === "privilege") { // Do not render privilege-only items as links
            return null;
          }

          if (!hasRequiredRole(item.requiredRoles)) {
            return null;
          }

          if (item.type === "heading") {
            const headingItem = item as NavHeading;
            let isOpen = false;
            let setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;

            if (headingItem.name === "Reports") {
              isOpen = isReportsOpen;
              setIsOpen = setIsReportsOpen;
            } else if (headingItem.name === "Actions") {
              isOpen = isActionsOpen;
              setIsOpen = setIsActionsOpen;
            } else if (headingItem.name === "Sales Management") {
              isOpen = isSalesManagementOpen;
              setIsOpen = setIsSalesManagementOpen;
            } else {
              isOpen = false;
              setIsOpen = () => {};
            }

            const visibleChildren = headingItem.children.filter(child => hasRequiredRole(child.requiredRoles));

            if (visibleChildren.length === 0) {
              return null;
            }

            return (
              <Collapsible key={headingItem.name} open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors duration-200 ease-in-out">
                  {headingItem.name}
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-4">
                  {visibleChildren.map((child) => (
                    <Link
                      key={child.name}
                      to={child.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 ease-in-out",
                        location.pathname.startsWith(child.href) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
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
            const navItem = item as NavItem;
            return (
              <Link
                key={navItem.name}
                to={navItem.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 ease-in-out",
                  location.pathname === navItem.href && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                )}
              >
                <navItem.icon className="h-5 w-5" />
                {navItem.name}
              </Link>
            );
          }
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;