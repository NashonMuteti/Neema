"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ViewingMemberContextType {
  viewingMemberName: string | null;
  setViewingMemberName: (name: string | null) => void;
}

const ViewingMemberContext = createContext<ViewingMemberContextType | undefined>(undefined);

export const ViewingMemberProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewingMemberName, setViewingMemberName] = useState<string | null>(null);

  return (
    <ViewingMemberContext.Provider value={{ viewingMemberName, setViewingMemberName }}>
      {children}
    </ViewingMemberContext.Provider>
  );
};

export const useViewingMember = () => {
  const context = useContext(ViewingMemberContext);
  if (context === undefined) {
    throw new Error('useViewingMember must be used within a ViewingMemberProvider');
  }
  return context;
};