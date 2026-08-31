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
  lastRegistrationFor,
  lastSchool,
  pickRegistration,
  rememberRegistration,
  rememberSchool,
} from "utils/lastContext";
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

    /* set currentSchool: localStorage → cookie → first school */
    let schoolIdx = 0;
    const savedSchoolId = lastSchool() || cookies.currentSchool;
    if (savedSchoolId) {
      const idx = user.schools.findIndex(
        (s: { school: string }) => String(s.school) === String(savedSchoolId)
      );
      if (idx !== -1) schoolIdx = idx;
      else if (cookies.currentSchool) {
        removeCookie("currentSchool", SESSION_COOKIE_OPTS);
      }
    }

    if (user.schools.length > schoolIdx) {
      const { school, academyFeatures } = await SchoolAPI.RSchool({
        params: { _id: user.schools[schoolIdx].school },
      });
      setCurrentSchool({ ...school, school: school._id, academyFeatures });
      setCookie("currentSchool", school._id, SESSION_COOKIE_OPTS);
      rememberSchool(school._id);
      document.title = school.schoolName;

      const schoolKey = String(school._id);
      const re = user.registrations.filter(
        (r: any) => String(r.school) === schoolKey
      );

      const savedRegId =
        lastRegistrationFor(schoolKey) || cookies.currentRegistration;
      const savedReg = savedRegId
        ? re.find((r: { _id: string }) => String(r._id) === String(savedRegId))
        : undefined;
      const nextReg = savedReg ?? pickRegistration(re);

      if (nextReg) {
        setCurrentRegistration(nextReg);
        setCookie("currentRegistration", nextReg._id, SESSION_COOKIE_OPTS);
        rememberRegistration(schoolKey, nextReg._id);
        SeasonAPI.RSeason({ params: { _id: nextReg.season } }).then(
          ({ season }) => {
            setCurrentSeason(season);
          }
        );
      } else if (cookies.currentRegistration) {
        removeCookie("currentRegistration", SESSION_COOKIE_OPTS);
      }
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
    const { school, academyFeatures } = await SchoolAPI.RSchool({
      params: { _id: to },
    });
    const schoolKey = String(school._id);
    setCurrentSchool({ ...school, school: school._id, academyFeatures });
    setCookie("currentSchool", school._id, SESSION_COOKIE_OPTS);
    rememberSchool(schoolKey);
    document.title = school.schoolName;

    if (String(currentSchool?._id) === schoolKey) {
      return;
    }

    const re =
      currentUser?.registrations.filter(
        (reg) => String(reg.school) === schoolKey
      ) ?? [];

    const savedRegId = lastRegistrationFor(schoolKey);
    const savedReg = savedRegId
      ? re.find((reg) => String(reg._id) === String(savedRegId))
      : undefined;
    const nextReg = savedReg ?? pickRegistration(re);

    if (nextReg) {
      setCookie("currentRegistration", nextReg._id, SESSION_COOKIE_OPTS);
      rememberRegistration(schoolKey, nextReg._id);
      setCurrentRegistration(nextReg);
      const { season } = await SeasonAPI.RSeason({
        params: { _id: nextReg.season },
      });
      setCurrentSeason(season);
    } else {
      removeCookie("currentRegistration", SESSION_COOKIE_OPTS);
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
      (reg) => String(reg._id) === String(rid)
    );
    if (!registration) return;

    setCurrentRegistration(registration);
    setCookie("currentRegistration", registration._id, SESSION_COOKIE_OPTS);
    const schoolKey = String(
      registration.school || currentSchool?._id || ""
    );
    if (schoolKey) {
      rememberRegistration(schoolKey, registration._id);
    }

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
