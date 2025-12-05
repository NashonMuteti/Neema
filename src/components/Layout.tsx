"use client";

import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-auto transition-all duration-300 ease-in-out">
          {children}
        </main>
        <footer className="p-4 text-center text-sm text-muted-foreground border-t shadow-inner transition-all duration-300 ease-in-out">
          <p>Your cinematic tagline here.</p>
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Layout;