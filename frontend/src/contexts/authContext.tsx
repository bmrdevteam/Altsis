import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";
import useDatabase from "../hooks/useDatabase";

const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const database = useDatabase()
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function getLoggedInUser() {
   const {user:res} = await database.R({location:"users"})
   setCurrentUser(res)
   console.log(res);
   return res
  }

  useEffect(() => {
    return () => {
      loading &&
        getLoggedInUser().then(() => {
          setLoading(false);
        }).catch((err)=>{
          setLoading(false);
        })
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
