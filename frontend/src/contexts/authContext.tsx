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
  const [cookies, setCookie, removeCookie] = useCookies(["currentSchool","currentSeason"]);
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
  let cookieData = '';

  async function getLoggedInUser() {
    await UserApi.RMySelf().then((res) => {
      /**
       * sets the current user
       */
      setCurrentUser(res);
      // set cookie currentsSchool   
      if(cookies.currentSchool == undefined){
        SchoolApi.RSchool(res.schools[0].school).then((s) => {
          setCurrentSchool((prev: any, s: any) => ({ ...prev, ...s }));
        });
        setCookie("currentSchool", res.schools[0].school);
        cookieData = res.schools[0].school;
      }else{
        SchoolApi.RSchool(cookies.currentSchool).then((s) => {
          setCurrentSchool((prev: any, s: any) => ({ ...prev, ...s }));
        });
        cookieData = cookies.currentSchool;
      }
      currentNotificationsRef.current = res.notifications;

      /** if there is a registration, set the season */
      if (res.registrations) _setRegistration(res.registrations);
      if (
        res.registrations.filter(
          (r: any) => r.school === cookieData && r.isActivated
        ).length > 0
      ) {
        const re = _.sortBy(
          res.registrations.filter(
            (r: any) => r.school === cookieData && r.isActivated
          ),
          "period.end"
        ).reverse();

        setRegistration(re);
        // set cookie currentSeason
        if(cookies.currentSeason == undefined){
          setCurrentRegistration(re[0]);
          setCookie("currentSeason", re[0].season);
          SeasonApi.RSeasonWithRegistrations(re[0].season).then((seasonData) => {
            setCurrentSeason(seasonData);
            setCurrentPermission(
              checkPermissionBySeason(seasonData, res.userId, re[0].role)
            );
          });
        }else{
          let registrationData = re.filter((r : any) => r.season === cookies.currentSeason);
          setCurrentRegistration(registrationData[0]);
          setCookie("currentSeason", registrationData[0].season);
          SeasonApi.RSeasonWithRegistrations(registrationData[0].season).then((seasonData) => {
            setCurrentSeason(seasonData);
            setCurrentPermission(
              checkPermissionBySeason(seasonData, res.userId, registrationData[0].role)
            );
          });
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
    // change cookie currentSchool
    SchoolApi.RSchool(to).then((s) => {
      setCurrentSchool({ ...s, school: s._id });
      setCookie("currentSchool", s._id);
      document.title = s.schoolName;
      
      const re = _.sortBy(
        _registrations.filter(
          (r: any) => r.school === s._id && r.isActivated,
          "period.end"
        )
      ).reverse();
      setRegistration(re);

      // change cookie currentSeason
      if (re.length > 0) {
          setCurrentRegistration(re[0]);
          SeasonApi.RSeasonWithRegistrations(re[0].season).then((seasonData) => {
            setCurrentSeason(seasonData);
            setCookie("currentSeason", re[0].season);
            setCurrentPermission(
              checkPermissionBySeason(seasonData, currentUser.userId, re[0].role)
            );
          });
      } else {
        setCurrentRegistration(undefined);
        setCurrentSeason(undefined);
        setCurrentPermission(checkPermissionBySeason(undefined, "", ""));
        removeCookie("currentSeason");
        removeCookie("currentSchool");
      }
    });
  }

  async function changeCurrentSeason(registration: any) {
    // change cookie currentSeason
    setCurrentRegistration(registration);
    const result = await SeasonApi.RSeasonWithRegistrations(
      registration?.season
    )
      .then((res) => {
        setCurrentSeason(res);
        setCookie("currentSeason", registration.season);
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
