"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  DollarSign,
  Wallet,
  Users,
  Settings,
  BarChart2,
  FileText,
  Handshake,
  RefreshCcw,
  Activity,
  ChevronDown,
  FolderX,
  TrendingUp,
  TrendingDown,
  UserCog,
  CalendarDays,
  Banknote,
  ShoppingCart,
  Package,
  Scale,
  ArrowRightLeft // New import
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredPrivileges?: string[];
  type?: "item";
}

export interface NavHeading {
  name: string;
  type: "heading";
  requiredPrivileges?: string[];
  children: NavItem[];
}

type SidebarItem = NavItem | NavHeading;

export const navItems: SidebarItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    requiredPrivileges: ["View Dashboard"],
  },
  {
    name: "Project Accounts",
    href: "/projects",
    icon: DollarSign,
    requiredPrivileges: ["View Project Accounts"],
  },
  {
    name: "Petty Cash",
    href: "/petty-cash",
    icon: Wallet,
    requiredPrivileges: ["View Petty Cash"],
  },
  {
    name: "Pledges",
    href: "/pledges",
    icon: Handshake,
    requiredPrivileges: ["View Pledges"],
  },
  {
    name: "Income",
    href: "/income",
    icon: TrendingUp,
    requiredPrivileges: ["View Income"],
  },
  {
    name: "Expenditure",
    href: "/expenditure",
    icon: TrendingDown,
    requiredPrivileges: ["View Expenditure"],
  },
  {
    name: "Sales Management",
    type: "heading",
    requiredPrivileges: ["View Sales Management"],
    children: [
      {
        name: "Stocks",
        href: "/sales/stocks",
        icon: Package,
        requiredPrivileges: ["View Stocks"],
      },
      {
        name: "Daily Sales",
        href: "/sales/daily",
        icon: ShoppingCart,
        requiredPrivileges: ["View Daily Sales"],
      },
      {
        name: "Debts",
        href: "/sales/debts",
        icon: Scale,
        requiredPrivileges: ["View Debts"],
      },
    ],
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    requiredPrivileges: ["View Members", "Manage Members"],
  },
  {
    name: "Board Members",
    href: "/board-members",
    icon: UserCog,
    requiredPrivileges: ["View Board Members"],
  },
  {
    name: "Reports",
    type: "heading",
    requiredPrivileges: ["View Reports"],
    children: [
      {
        name: "Member Contributions Report",
        href: "/reports/member-contributions",
        icon: BarChart2,
        requiredPrivileges: ["View Member Contributions Report"],
      },
      {
        name: "Petty Cash Report",
        href: "/reports/petty-cash",
        icon: FileText,
        requiredPrivileges: ["View Petty Cash Report"],
      },
      {
        name: "Pledge Report",
        href: "/reports/pledges",
        icon: FileText,
        requiredPrivileges: ["View Pledge Report"],
      },
      {
        name: "Table Banking Summary",
        href: "/reports/table-banking-summary",
        icon: Banknote,
        requiredPrivileges: ["View Table Banking Summary"],
      },
      {
        name: "User Activity Report",
        href: "/reports/user-activity",
        icon: Activity,
        requiredPrivileges: ["View User Activity Report"],
      },
    ],
  },
  {
    name: "Actions",
    type: "heading",
    requiredPrivileges: ["Perform Admin Actions"],
    children: [
      {
        name: "Initialize Balances",
        href: "/initialize-balances",
        icon: RefreshCcw,
        requiredPrivileges: ["Initialize Balances"],
      },
      {
        name: "Transfer Funds", // New menu item
        href: "/transfer-funds",
        icon: ArrowRightLeft,
        requiredPrivileges: ["Manage Funds Transfer"], // New privilege
      },
      {
        name: "Deleted Projects Report", // Moved here
        href: "/reports/deleted-projects",
        icon: FolderX,
        requiredPrivileges: ["View Deleted Projects Report"],
      },
    ],
  },
  {
    name: "My Contributions",
    href: "/my-contributions",
    icon: CalendarDays,
    requiredPrivileges: ["View My Contributions"],
  },
  {
    name: "Admin Settings",
    href: "/admin/settings",
    icon: Settings,
    requiredPrivileges: ["Access Admin Settings"],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { currentUser, isLoading } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();

  const [isReportsOpen, setIsReportsOpen] = React.useState(false);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [isSalesManagementOpen, setIsSalesManagementOpen] = React.useState(false);

  const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser?.role);
  const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];

  const hasAccess = React.useCallback((requiredPrivileges?: string[]) => {
    if (!requiredPrivileges || requiredPrivileges.length === 0) return true;
    return requiredPrivileges.some(privilege => currentUserPrivileges.includes(privilege));
  }, [currentUserPrivileges]);

  const accessibleNavItems = React.useMemo(() => {
    return navItems.filter(item => {
      if (!hasAccess(item.requiredPrivileges)) {
        return false;
      }
      if (item.type === "heading") {
        const accessibleChildren = item.children.filter(child => hasAccess(child.requiredPrivileges));
        return accessibleChildren.length > 0;
      }
      return true;
    });
  }, [hasAccess]);

  React.useEffect(() => {
    const checkAndSetOpen = (headingName: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      const headingItem = accessibleNavItems.find(item => item.type === "heading" && item.name === headingName) as NavHeading | undefined;
      if (headingItem) {
        const isChildActive = headingItem.children.some(child => 
          location.pathname.startsWith(child.href) && hasAccess(child.requiredPrivileges)
        );
        setter(isChildActive);
      } else {
        setter(false);
      }
    };

    checkAndSetOpen("Reports", setIsReportsOpen);
    checkAndSetOpen("Actions", setIsActionsOpen);
    checkAndSetOpen("Sales Management", setIsSalesManagementOpen);
  }, [location.pathname, accessibleNavItems, hasAccess]);

  return (
    <aside className="w-64 bg-sidebar border-r shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading navigation...
        </div>
      ) : !currentUser ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Please log in.
        </div>
      ) : (
        <nav className="flex-1 space-y-2">
          {accessibleNavItems.map((item) => {
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

              return (
                <Collapsible
                  key={headingItem.name}
                  open={isOpen}
                  onOpenChange={setIsOpen}
                  className="space-y-2"
                >
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors duration-200 ease-in-out"
                    )}
                  >
                    {headingItem.name}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-4">
                    {headingItem.children
                      .filter(child => hasAccess(child.requiredPrivileges))
                      .map((child) => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 ease-in-out",
                            location.pathname.startsWith(child.href) &&
                              "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
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
                    location.pathname === navItem.href &&
                      "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                  )}
                >
                  <navItem.icon className="h-5 w-5" />
                  {navItem.name}
                </Link>
              );
            }
          })}
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;