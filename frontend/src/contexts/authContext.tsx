import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function getLoggedInUser() {
    axios
      .get(`${process.env.REACT_APP_SERVER_URL}/api/user/info`, {
        withCredentials: true,
      })
      .then((res) => {
        setCurrentUser(res.data._user ?? null);
      })
      .catch((error) => {
        error.response.status === 403 && setCurrentUser(null);
        
      });
  }

  useEffect(() => {
    return () => {
      loading &&
        getLoggedInUser().then(() => {
          setLoading(false);
        });
    };
  }, [loading]);

  const value = {
    setCurrentUser,
    currentUser,
    loading,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
