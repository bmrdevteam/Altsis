import Loading from "components/loading/Loading";
import useApi from "hooks/useApi";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

import _ from "lodash";
import { useCookies } from "react-cookie";

import { TCurrentUser, TCurrentRegistration, TCurrentSeason } from "types/auth";
import useAPIv2 from "hooks/useAPIv2";
import { TSchool } from "types/schools";

const AuthContext = createContext<any>(null);

export function useAuth(): {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: TCurrentUser;
  setCurrentUser: React.Dispatch<TCurrentUser>;
  currentSchool: TSchool;
  changeSchool: (to: string) => void;
  currentRegistration: TCurrentRegistration;
  changeRegistration: (rid: string) => void;
  reloadRegistration: () => void;
  currentSeason: TCurrentSeason;
} {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { UserAPI, SchoolAPI, SeasonAPI, RegistrationAPI } = useAPIv2();
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
  const [currentUser, setCurrentUser] = useState<TCurrentUser>();
  const [currentSchool, setCurrentSchool] = useState<TSchool>();
  const [currentRegistration, setCurrentRegistration] =
    useState<TCurrentRegistration>();
  const [currentSeason, setCurrentSeason] = useState<TCurrentSeason>();

  const [loading, setLoading] = useState<boolean>(true);

  /** Date for setting the cookie expire date  */
  const date = new Date();
  let cookieData = "";

  async function getLoggedInUser() {
    const { user } = await UserAPI.RMySelf();

    /* set currentUser */
    setCurrentUser({ ...user });
    document.title = user.academyName;

    /* set currentSchool using cookie */
    let schoolIdx = 0;
    if (cookies.currentSchool) {
      const idx = _.findIndex(user.schools, {
        school: cookies.currentSchool,
      });
      if (idx !== -1) schoolIdx = idx;
      else removeCookie("currentSchool");
    }

    if (user.schools.length > schoolIdx) {
      const { school } = await SchoolAPI.RSchool({
        params: { _id: user.schools[schoolIdx].school },
      });
      setCurrentSchool({ ...school, school: school._id });
      setCookie("currentSchool", school._id);
      document.title = school.schoolName;
    }

    /* set currentRegistration using cookie */
    const re = user.registrations.filter(
      (r: any) => r.school === user.schools[schoolIdx].school
    );

    let registrationIdx = 0;
    if (cookies.currentRegistration) {
      const idx = _.findIndex(re, { _id: cookies.currentRegistration });
      if (idx !== -1) registrationIdx = idx;
      else removeCookie("currentRegistration");
    }

    if (re.length > registrationIdx) {
      setCurrentRegistration(re[registrationIdx]);
      setCookie("currentRegistration", re[registrationIdx]._id);

      SeasonAPI.RSeason({ params: { _id: re[registrationIdx].season } }).then(
        ({ season }) => {
          setCurrentSeason(season);
        }
      );
    }
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

  async function changeSchool(to: string) {
    const { school } = await SchoolAPI.RSchool({ params: { _id: to } });
    setCurrentSchool({ ...school, school: school._id });
    setCookie("currentSchool", school._id);
    removeCookie("currentRegistration");
    document.title = school.schoolName;

    const re =
      currentUser?.registrations.filter((reg) => reg.school === school._id) ??
      [];

    if (re.length > 0) {
      setCookie("currentRegistration", re[0]._id);
      setCurrentRegistration(re[0]);
      const { season } = await SeasonAPI.RSeason({
        params: { _id: re[0].season },
      });
      setCurrentSeason(season);
    } else {
      setCurrentRegistration(undefined);
      setCurrentSeason(undefined);
    }
  }

  async function changeRegistration(rid: string) {
    const registration = _.find(
      currentUser?.registrations,
      (reg) => reg._id === rid
    );
    if (!registration) return;

    setCurrentRegistration(registration);
    setCookie("currentRegistration", registration._id);

    const { season } = await SeasonAPI.RSeason({
      params: { _id: registration.season },
    });
    setCurrentSeason(season);
  }

  const reloadRegistration = async () => {
    if (currentRegistration?._id) {
      const { registration } = await RegistrationAPI.RRegistration({
        params: { _id: currentRegistration._id },
      });
      setCurrentRegistration(registration);
    }
  };

  const value = {
    loading,
    setLoading,
    currentUser,
    setCurrentUser,
    currentSchool,
    changeSchool,
    currentRegistration,
    changeRegistration,
    reloadRegistration,
    currentSeason,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <Loading height={"100vh"} />}
    </AuthContext.Provider>
  );
};
