"use client";

import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import { useBranding } from "@/context/BrandingContext"; // Import useBranding
import { Outlet } from "react-router-dom"; // Import Outlet

const Layout: React.FC = () => { // Removed LayoutProps interface and children prop
  const { tagline } = useBranding(); // Use the branding context

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-auto transition-all duration-300 ease-in-out">
          <Outlet /> {/* Render nested routes here */}
        </main>
        <footer className="p-4 text-center text-sm text-muted-foreground border-t shadow-inner transition-all duration-300 ease-in-out">
          <p>{tagline}</p> {/* Use dynamic tagline */}
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Layout;