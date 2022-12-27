import Loading from "components/loading/Loading";
import useApi from "hooks/useApi";
import React, { createContext, useContext, useState, useEffect } from "react";
import useDatabase from "../hooks/useDatabase";
import _ from "lodash";
import { checkPermissionBySeason } from "functions/functions";

const AuthContext = createContext<any>(null);

export function useAuth(): {
  setCurrentUser: React.Dispatch<any>;
  currentUser: any;
  currentSchool: any;
  setCurrentSchool: any;
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
        res.registrations.filter(
          (r: any) => r.school === res.schools[0].school && r.isActivated
        ).length > 0
      ) {
        const re = _.sortBy(
          res.registrations.filter(
            (r: any) => r.school === res.schools[0].school && r.isActivated
          ),
          "period.end"
        ).reverse();

        setRegistration(re);
        setCurrentRegistration(re[0]);
        SeasonApi.RSeason(re[0].season).then((seasonData) => {
          setCurrentSeason(seasonData);
          setCurrentPermission(
            checkPermissionBySeason(seasonData, res.userId, re[0].role)
          );
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

      const re = _.sortBy(
        _registrations.filter(
          (r: any) => r.school === s._id && r.isActivated,
          "period.end"
        )
      ).reverse();
      setRegistration(re);

      if (re.length > 0) {
        setCurrentRegistration(re[0]);
        SeasonApi.RSeason(re[0].season).then((seasonData) => {
          setCurrentSeason(seasonData);
          setCurrentPermission(
            checkPermissionBySeason(seasonData, currentUser.userId, re[0].role)
          );
        });
      } else {
        setCurrentRegistration(undefined);
        setCurrentSeason(undefined);
        setCurrentPermission(checkPermissionBySeason(undefined, "", ""));
      }
    });
  }

  async function changeCurrentSeason(registration: any) {
    setCurrentRegistration(registration);
    const result = await SeasonApi.RSeason(registration?.season)
      .then((res) => {
        setCurrentSeason(res);
        setCurrentPermission(
          checkPermissionBySeason(res, currentUser.userId, registration.role)
        );
      })
      .catch(() => {});
    return result;
  }

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
    setCurrentSchool,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <Loading height={"100vh"} />}
    </AuthContext.Provider>
  );
};
