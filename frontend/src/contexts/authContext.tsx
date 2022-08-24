import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";
import useDatabase from "../hooks/useDatabase";

const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const database = useDatabase();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSchool, setCurrentSchool] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function getLoggedInUser() {
    const { user: res } = await database.R({ location: "users" });
    setCurrentUser(res);
    return res;
  }

  useEffect(() => {
    loading &&
      getLoggedInUser()
        .then(() => {
          setLoading(false);
          // setCurrentSchool();
        })
        .catch((err) => {
          setLoading(false);
        });

    return () => {};
  }, [loading]);

  const value = {
    setCurrentUser,
    currentUser,
    loading,
    setLoading,
    currentSchool,
    setCurrentSchool,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
