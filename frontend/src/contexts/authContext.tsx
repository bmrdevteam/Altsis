import Loading from "components/loading/Loading";
import useApi from "hooks/useApi";
import React, { createContext, useContext, useState, useEffect } from "react";
import useDatabase from "../hooks/useDatabase";

const AuthContext = createContext<any>(null);

export function useAuth(): {
  setCurrentUser: React.Dispatch<any>;
  currentUser: any;
  currentSchool: any;
  changeSchool: (to: string) => void;
  currentSeason: any;
  changeCurrentSeason: (season: any) => void;
  currentRegistration: any;
  registrations: any;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  updateUserProfile: React.Dispatch<any>;
  deleteUserProfile: React.Dispatch<any>;
  currentNotifications: any;
  setCurrentNotifications: React.Dispatch<any>;
  currentPermission: any;
} {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { UserApi, SeasonApi, SchoolApi, RegistrationApi } = useApi();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSchool, setCurrentSchool] = useState<any>();
  const [currentRegistration, setCurrentRegistration] = useState<any>();
  const [currentPermission, setCurrentPermission] = useState<any>({});
  const [_registrations, _setRegistration] = useState<any>([]);
  const [registrations, setRegistration] = useState<any>([]);
  const [currentSeason, setCurrentSeason] = useState<any>();
  const [currentNotifications, setCurrentNotifications] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function getLoggedInUser() {
    await UserApi.RMySelf().then((res) => {
      /**
       * sets the current user
       */
      setCurrentUser(res);
      setCurrentSchool(res.schools[0]);
      SchoolApi.RSchool(res.schools[0].school).then((s) => {
        setCurrentSchool((prev: any) => ({ ...prev, ...s }));
      });
      setCurrentNotifications(res.notifications);

      /** if there is a registration, set the season */
      if (res.registrations) _setRegistration(res.registrations);
      if (
        res.registrations.filter((r: any) => r.school === res.schools[0].school)
          .length > 0
      ) {
        const re = res.registrations.filter(
          (r: any) => r.school === res.schools[0].school
        );
        setRegistration(re);
        setCurrentRegistration(re[0]);
        SeasonApi.RSeason(re[0].season).then((res) => {
          setCurrentSeason(res);
        });
      }
    });
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
  }, [loading]);

  function changeSchool(to: string) {
    SchoolApi.RSchool(to).then((s) => {
      setCurrentSchool({ ...s, school: s._id });
    });
  }
  async function changeCurrentSeason(registration: any) {
    setCurrentRegistration(registration);
    const result = await SeasonApi.RSeason(registration?.season)
      .then((res) => {
        setCurrentSeason(res);
      })
      .catch(() => {});
    return result;
  }

  const checkPermission = (permission: any) => {
    for (let i = 0; i < permission?.length; i++) {
      if (
        permission[i][0] === "userId" &&
        permission[i][1] === currentUser?.userId
      ) {
        return permission[i][2];
      }
      if (
        permission[i][0] === "role" &&
        permission[i][1] === currentRegistration?.role
      )
        return permission[i][2];
    }
    return false;
  };

  useEffect(() => {
    const permission = {
      permissionSyllabus: false,
      permissionEnrollment: false,
      permissionEvaluation: false,
      permissionNotification: false,
    };

    // permissionSyllabus
    if (checkPermission(currentSeason?.permissionSyllabus))
      permission["permissionSyllabus"] = true;

    // permissionEnrollment
    if (checkPermission(currentSeason?.permissionEnrollment))
      permission["permissionEnrollment"] = true;

    // permissionEvaluation
    if (checkPermission(currentSeason?.permissionEvaluation))
      permission["permissionEvaluation"] = true;

    // permissionNotification?
    if (checkPermission(currentSeason?.permissionNotification))
      permission["permissionNotification"] = true;

    setCurrentPermission(permission);
  }, [currentSeason]);

  const updateUserProfile = (profile: string) => {
    setCurrentUser({ ...currentUser, profile });
  };
  const deleteUserProfile = () => {
    setCurrentUser({ ...currentUser, profile: undefined });
  };

  const value = {
    setCurrentUser,
    currentUser,
    loading,
    currentSeason,
    registrations,
    changeCurrentSeason,
    currentRegistration,
    setLoading,
    changeSchool,
    currentSchool,
    updateUserProfile,
    deleteUserProfile,
    currentNotifications,
    setCurrentNotifications,
    currentPermission,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <Loading height={"100vh"} />}
    </AuthContext.Provider>
  );
};
