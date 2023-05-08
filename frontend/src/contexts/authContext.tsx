import Loading from "components/loading/Loading";
import useApi from "hooks/useApi";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import useDatabase from "../hooks/useDatabase";
import _ from "lodash";
import { useCookies } from "react-cookie";
import { checkPermissionBySeason } from "functions/functions";
import { io } from "socket.io-client";

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
  updateCurrentRegistration: any;
  registrations: any;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  updateUserProfile: React.Dispatch<any>;
  deleteUserProfile: React.Dispatch<any>;
  currentNotificationsRef: any;
  currentPermission: any;
  socket: any;
} {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { UserApi, SeasonApi, SchoolApi, RegistrationApi } = useApi();
  const [cookies, setCookie, removeCookie] = useCookies([
    "currentSchool",
    "currentRegistration",
  ]);
  const [current, setCurrent] = useState<{
    user: any;
    school: any;
    loading: boolean;
  }>({
    user: {},
    school: {},
    loading: true,
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSchool, setCurrentSchool] = useState<any>();
  const [currentRegistration, setCurrentRegistration] = useState<any>();
  const [currentPermission, setCurrentPermission] = useState<any>();
  const [_registrations, _setRegistration] = useState<any>([]);
  const [registrations, setRegistration] = useState<any>([]);
  const [currentSeason, setCurrentSeason] = useState<any>();
  const currentNotificationsRef = useRef<any[]>([]);
  const [socket, setSocket] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  /** Date for setting the cookie expire date  */
  const date = new Date();
  let cookieData = "";

  async function getLoggedInUser() {
    await UserApi.RMySelf().then((res) => {
      /**
       * sets the current user
       */
      setCurrentUser(res);

      /* set school idx using cookie */
      let schoolIdx = 0;
      if (cookies.currentSchool) {
        const idx = _.findIndex(res.schools, { school: cookies.currentSchool });
        if (idx !== -1) schoolIdx = idx;
        else removeCookie("currentSchool");
      }

      if (res.schools.length > schoolIdx) {
        SchoolApi.RSchool(res.schools[schoolIdx].school).then((s) => {
          setCurrentSchool({ ...s, school: s._id });
        });
        setCookie("currentSchool", res.schools[schoolIdx].school);
      }

      currentNotificationsRef.current = res.notifications;

      /** if there is a registration, set the season */
      if (res.registrations) _setRegistration(res.registrations);
      if (
        res.registrations.filter(
          (r: any) =>
            r.school === res.schools[schoolIdx].school && r.isActivated
        ).length > 0
      ) {
        const re = _.sortBy(
          res.registrations.filter(
            (r: any) =>
              r.school === res.schools[schoolIdx].school && r.isActivated
          ),
          "period.end"
        ).reverse();

        setRegistration(re);

        let registrationIdx = 0;
        if (cookies.currentRegistration) {
          const idx = _.findIndex(re, { _id: cookies.currentRegistration });
          if (idx !== -1) registrationIdx = idx;
          else removeCookie("currentRegistration");
        }

        if (re.length > registrationIdx) {
          setCurrentRegistration(re[registrationIdx]);
          SeasonApi.RSeasonWithRegistrations(re[registrationIdx].season).then(
            (seasonData) => {
              setCurrentSeason(seasonData);
              setCurrentPermission(
                checkPermissionBySeason(
                  seasonData,
                  res.userId,
                  re[registrationIdx].role
                )
              );
            }
          );

          setCookie("currentRegistration", re[registrationIdx]._id);
        }
      }

      setSocket(
        io(`${process.env.REACT_APP_SERVER_URL}`, {
          path: "/socket.io",
          withCredentials: true,
        })
      );
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

  useEffect(() => {
    if (socket !== undefined && currentUser.academyId && currentUser.userId) {
      socket.emit("activate real-time notification", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    }
  }, [socket]);

  function changeSchool(to: string) {
    SchoolApi.RSchool(to).then((s) => {
      setCurrentSchool({ ...s, school: s._id });
      setCookie("currentSchool", s._id);
      removeCookie("currentRegistration");
      document.title = s.schoolName;

      const re = _.sortBy(
        _registrations.filter(
          (r: any) => r.school === s._id && r.isActivated,
          "period.end"
        )
      ).reverse();
      setRegistration(re);

      if (re.length > 0) {
        setCookie("currentRegistration", re[0]._id);
        setCurrentRegistration(re[0]);
        SeasonApi.RSeasonWithRegistrations(re[0].season).then((seasonData) => {
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
    setCookie("currentRegistration", registration._id);
    const result = await SeasonApi.RSeasonWithRegistrations(
      registration?.season
    )
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

  const updateCurrentRegistration = async () => {
    if (currentRegistration) {
      const idx = _.findIndex(registrations, { _id: currentRegistration._id });
      if (idx !== -1) {
        const registration = await RegistrationApi.RRegistration(
          currentRegistration._id
        );
        const reg = registrations;
        reg[idx] = registration;
        setRegistration(reg);
        setCurrentRegistration(registration);
      }
    }
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
    currentNotificationsRef,
    currentPermission,
    setCurrentSchool,
    socket,
    updateCurrentRegistration,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <Loading height={"100vh"} />}
    </AuthContext.Provider>
  );
};
