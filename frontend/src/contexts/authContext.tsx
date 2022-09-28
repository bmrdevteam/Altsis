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
  const [schoolUsers, setSchoolUsers] = useState<any>(null);
  const [currentSchoolUser, setCurrentSchoolUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function getLoggedInUser() {
    const { user: res, schoolUsers: users } = await database.R({
      location: "users",
    });
    
    setCurrentUser(res);
    setSchoolUsers(users);
    setCurrentSchoolUser(users[0]);
    return res;
  }

  useEffect(() => {
    loading &&
      getLoggedInUser()
        .then(() => {
          setLoading(false);
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
    currentSchoolUser,schoolUsers
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
