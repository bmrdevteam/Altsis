import React, { createContext, useContext, useState } from "react";

const SidebarContext = createContext<any>(null);

export function useSidebar() {
  return useContext(SidebarContext);
}

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [sidebarClose, setSidebarClose] = useState<boolean>(false);

  const value = {
    sidebarClose,
    setSidebarClose,
  };
  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
