import Loading from "components/loading/Loading";
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
import { SESSION_COOKIE_OPTS, clearAuthClientCookies } from "utils/authCookies";
import {
  decideResumeSessionCheck,
  isSessionAuthFailure,
  loginPathForAcademy,
} from "utils/sessionAuth";
import { installTabResumeListener } from "utils/tabResume";

const AuthContext = createContext<any>(null);

export function useAuth(): {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: TCurrentUser;
  setCurrentUser: React.Dispatch<TCurrentUser>;
  currentSchool: TSchool;
  changeSchool: (to: string) => Promise<void>;
  /** 현재 학교 필드만 부분 갱신 (기능 토글 등) */
  patchCurrentSchool: (partial: Partial<TSchool>) => void;
  currentRegistration: TCurrentRegistration;
  changeRegistration: (rid: string) => void;
  reloadRegistration: () => void;
  currentSeason: TCurrentSeason;
  patchCurrentSeason: (partial: Partial<TCurrentSeason>) => void;
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

  const userApiRef = useRef(UserAPI);
  userApiRef.current = UserAPI;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const removeCookieRef = useRef(removeCookie);
  removeCookieRef.current = removeCookie;
  const resumeCheckInFlightRef = useRef(false);
  const lastResumeOkAtRef = useRef(0);

  async function getLoggedInUser() {
    const { user } = await UserAPI.RMySelf();

    /* set currentUser */
    setCurrentUser({ ...user });
    document.title = user.academyName;

    /* set currentSchool using cookie */
    let schoolIdx = 0;
    if (cookies.currentSchool) {
      const idx = user.schools.findIndex(
        (s: { school: string }) =>
          String(s.school) === String(cookies.currentSchool)
      );
      if (idx !== -1) schoolIdx = idx;
      else removeCookie("currentSchool", SESSION_COOKIE_OPTS);
    }

    if (user.schools.length > schoolIdx) {
      const { school, academyFeatures } = await SchoolAPI.RSchool({
        params: { _id: user.schools[schoolIdx].school },
      });
      setCurrentSchool({ ...school, school: school._id, academyFeatures });
      setCookie("currentSchool", school._id, SESSION_COOKIE_OPTS);
      document.title = school.schoolName;
    }

    /* set currentRegistration using cookie */
    const re = user.registrations.filter(
      (r: any) => r.school === user.schools[schoolIdx].school
    );

    let registrationIdx = 0;
    if (cookies.currentRegistration) {
      const idx = re.findIndex(
        (r: { _id: string }) =>
          String(r._id) === String(cookies.currentRegistration)
      );
      if (idx !== -1) registrationIdx = idx;
      else removeCookie("currentRegistration", SESSION_COOKIE_OPTS);
    }

    if (re.length > registrationIdx) {
      setCurrentRegistration(re[registrationIdx]);
      setCookie(
        "currentRegistration",
        re[registrationIdx]._id,
        SESSION_COOKIE_OPTS
      );

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
          lastResumeOkAtRef.current = Date.now();
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
  }, [loading]);

  useEffect(() => {
    const resumeSession = async () => {
      const decision = decideResumeSessionCheck({
        loading: loadingRef.current,
        hasUser: Boolean(currentUserRef.current),
        pathname:
          typeof window !== "undefined" ? window.location.pathname : "",
        inFlight: resumeCheckInFlightRef.current,
        lastOkAt: lastResumeOkAtRef.current,
        now: Date.now(),
      });
      if (decision !== "check") return;

      resumeCheckInFlightRef.current = true;
      try {
        await userApiRef.current.RMySelf();
        lastResumeOkAtRef.current = Date.now();
      } catch (err) {
        if (!isSessionAuthFailure(err)) return;
        const academyId = currentUserRef.current?.academyId;
        clearAuthClientCookies(removeCookieRef.current);
        setCurrentUser(undefined);
        setCurrentSchool(undefined);
        setCurrentRegistration(undefined);
        setCurrentSeason(undefined);
        const loginPath = loginPathForAcademy(academyId);
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.replace(loginPath);
        }
      } finally {
        resumeCheckInFlightRef.current = false;
      }
    };

    return installTabResumeListener(() => {
      void resumeSession();
    });
  }, []);

  async function changeSchool(to: string) {
    const { school, academyFeatures } = await SchoolAPI.RSchool({ params: { _id: to } });
    setCurrentSchool({ ...school, school: school._id, academyFeatures });
    setCookie("currentSchool", school._id, SESSION_COOKIE_OPTS);
    removeCookie("currentRegistration", SESSION_COOKIE_OPTS);
    document.title = school.schoolName;

    const re =
      currentUser?.registrations.filter((reg) => reg.school === school._id) ??
      [];

    if (re.length > 0) {
      setCookie("currentRegistration", re[0]._id, SESSION_COOKIE_OPTS);
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

  function patchCurrentSchool(partial: Partial<TSchool>) {
    setCurrentSchool((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  function patchCurrentSeason(partial: Partial<TCurrentSeason>) {
    setCurrentSeason((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  async function changeRegistration(rid: string) {
    const registration = _.find(
      currentUser?.registrations,
      (reg) => reg._id === rid
    );
    if (!registration) return;

    setCurrentRegistration(registration);
    setCookie("currentRegistration", registration._id, SESSION_COOKIE_OPTS);

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
    patchCurrentSchool,
    currentRegistration,
    changeRegistration,
    reloadRegistration,
    currentSeason,
    patchCurrentSeason,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <Loading height={"100vh"} />}
    </AuthContext.Provider>
  );
};
