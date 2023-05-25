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

import { TUser, TSchool, TRegistration, TSeason } from "types/auth";

const AuthContext = createContext<any>(null);

export function useAuth(): {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: TUser;
  setCurrentUser: React.Dispatch<TUser>;
  currentSchool: TSchool;
  changeSchool: (to: string) => void;
  currentRegistration: TRegistration;
  changeRegistration: (rid: string) => void;
  reloadRegistration: () => void;
  currentSeason: TSeason;
  updateUserProfile: React.Dispatch<any>;
  deleteUserProfile: React.Dispatch<any>;
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
  const [currentUser, setCurrentUser] = useState<TUser>();
  const [currentSchool, setCurrentSchool] = useState<TSchool>();
  const [currentRegistration, setCurrentRegistration] =
    useState<TRegistration>();
  const [currentSeason, setCurrentSeason] = useState<TSeason>();

  const [loading, setLoading] = useState<boolean>(true);
  /** Date for setting the cookie expire date  */
  const date = new Date();
  let cookieData = "";

  async function getLoggedInUser() {
    const { user, registrations } = await UserApi.RMySelf();

    const userRegistrations = _.orderBy(
      registrations.filter((r: TRegistration) => r.isActivated),
      [(reg) => reg?.period?.end ?? ""],
      ["desc"]
    );

    /* set currentUser */
    setCurrentUser({
      ...user,
      registrations: userRegistrations,
    });
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
      const school = await SchoolApi.RSchool(user.schools[schoolIdx].school);
      setCurrentSchool({ ...school, school: school._id });
      setCookie("currentSchool", school._id);
      document.title = school.schoolName;
    }

    /* set currentRegistration using cookie */
    const re = userRegistrations.filter(
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

      SeasonApi.RSeasonWithRegistrations(re[registrationIdx].season).then(
        (seasonData) => {
          setCurrentSeason(seasonData);
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
    const school = await SchoolApi.RSchool(to);
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
      const seasonData = await SeasonApi.RSeasonWithRegistrations(re[0].season);
      setCurrentSeason(seasonData);
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

    const season = await SeasonApi.RSeasonWithRegistrations(
      registration.season
    );
    setCurrentSeason(season);
  }

  const updateUserProfile = (profile: string) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, profile });
    }
  };
  const deleteUserProfile = () => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, profile: undefined });
    }
  };

  const reloadRegistration = async () => {
    if (currentRegistration?._id) {
      const registration = await RegistrationApi.RRegistration(
        currentRegistration._id
      );
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
    updateUserProfile,
    deleteUserProfile,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <Loading height={"100vh"} />}
    </AuthContext.Provider>
  );
};
