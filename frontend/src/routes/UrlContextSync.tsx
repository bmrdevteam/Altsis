import { useEffect, useRef } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { useAuth } from "contexts/authContext";

/** Path segments that are known app routes (not academy IDs) */
const KNOWN_PATH_SEGMENTS = new Set([
  "admin",
  "courses",
  "archive",
  "myArchive",
  "docs",
  "forms",
  "notifications",
  "boards",
  "settings",
  "myaccount",
  "search",
  "dev",
]);

const UrlContextSync = () => {
  const { academyId: urlAcademyId, schoolId: urlSchoolId } = useParams<{
    academyId: string;
    schoolId: string;
  }>();
  const { currentUser, currentSchool, changeSchool } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const changingRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !urlAcademyId || !urlSchoolId) return;
    if (changingRef.current) return;

    if (urlAcademyId !== currentUser.academyId) {
      // Legacy URL without /:academyId/:schoolId prefix — redirect gracefully
      if (KNOWN_PATH_SEGMENTS.has(urlAcademyId)) {
        const schoolId =
          currentSchool?.schoolId || currentUser.schools?.[0]?.schoolId;
        if (schoolId) {
          navigate(
            `/${currentUser.academyId}/${schoolId}${location.pathname}${location.search}`,
            { replace: true }
          );
          return;
        }
      }
      alert("잘못된 접근입니다.");
      navigate("/login", { replace: true });
      return;
    }

    if (urlSchoolId !== currentSchool?.schoolId) {
      const matchedSchool = currentUser.schools.find(
        (s: any) => s.schoolId === urlSchoolId
      );
      if (matchedSchool) {
        changingRef.current = true;
        changeSchool(matchedSchool.school).finally(() => {
          changingRef.current = false;
        });
      } else {
        alert("해당 학교에 접근 권한이 없습니다.");
        if (currentSchool?.schoolId) {
          navigate(
            `/${currentUser.academyId}/${currentSchool.schoolId}/`,
            { replace: true }
          );
        } else {
          navigate("/login", { replace: true });
        }
      }
    }
  }, [urlAcademyId, urlSchoolId, currentUser, currentSchool]);

  return <Outlet />;
};

export default UrlContextSync;
