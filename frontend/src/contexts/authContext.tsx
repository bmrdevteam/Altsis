import React, { createContext, useContext, useState, useEffect } from "react";
import useDatabase from "../hooks/useDatabase";

const AuthContext = createContext<any>(null);

export function useAuth(): {
  setCurrentUser: React.Dispatch<any>;
  currentUser: any;
  currentSchool: any;
  currentSeason: any;
  setCurrentSeason: React.Dispatch<any>;
  registrations: any;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
} {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const database = useDatabase();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSchool, setCurrentSchool] = useState<any>();
  const [currentSeason, setCurrentSeason] = useState<any>();
  const [registrations, setRegistration] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);

  async function getLoggedInUser() {
    const res = await database.R({
      location: "users/current",
    });
    /**
     * sets the current user
     */
    setCurrentUser(res);
    setCurrentSchool(res.schools[0]);
    /** if there is a registration, set the season */
    if (res.registrations[0]) {
      setRegistration(res.registrations);
      setCurrentSeason(res.registrations[0]);
    }

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
    currentSeason,
    registrations,
    setCurrentSeason,
    setLoading,
    currentSchool,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
