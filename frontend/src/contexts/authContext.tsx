import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // axios.post
    return setLoading(false)
  }, []);

  const value = {
    setCurrentUser,
    currentUser,
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
