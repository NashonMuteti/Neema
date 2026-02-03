"use client";

import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useBranding } from "@/context/BrandingContext";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const Layout: React.FC = () => {
  const { tagline } = useBranding();
  const isMobile = useIsMobile();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Auto-hide the sidebar on small screens.
  React.useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
      setMobileNavOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      {!isMobile ? (
        <Sidebar
          variant="desktop"
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
        />
      ) : null}

      {/* Mobile sidebar (sheet/drawer) */}
      {isMobile ? (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar variant="mobile" onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : null}

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          onOpenMobileNav={isMobile ? () => setMobileNavOpen(true) : undefined}
        />
        <main className="flex-1 p-6 overflow-auto transition-all duration-300 ease-in-out">
          <Outlet />
        </main>
        <footer className="p-4 text-center text-sm text-muted-foreground border-t shadow-inner transition-all duration-300 ease-in-out">
          <p>{tagline}</p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;