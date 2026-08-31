import { useEffect, useRef } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { useAuth } from "contexts/authContext";
import { homeSchoolId } from "utils/lastContext";

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
  "sites",
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
        const schoolId = homeSchoolId(currentUser, currentSchool);
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

    const matchedSchool = currentUser.schools.find(
      (s: any) =>
        s.schoolId === urlSchoolId || String(s.school) === String(urlSchoolId)
    );
    if (!matchedSchool) {
      alert("해당 학교에 접근 권한이 없습니다.");
      if (currentSchool?.schoolId) {
        navigate(`/${currentUser.academyId}/${currentSchool.schoolId}/`, {
          replace: true,
        });
      } else {
        navigate("/login", { replace: true });
      }
      return;
    }

    const alreadyOnSchool =
      urlSchoolId === currentSchool?.schoolId ||
      String(currentSchool?._id) === String(matchedSchool.school);
    if (alreadyOnSchool) return;

    changingRef.current = true;
    changeSchool(matchedSchool.school).finally(() => {
      changingRef.current = false;
    });
  }, [urlAcademyId, urlSchoolId, currentUser, currentSchool]);

  return <Outlet />;
};

export default UrlContextSync;
