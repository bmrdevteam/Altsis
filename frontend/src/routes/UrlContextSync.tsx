import { useEffect, useRef } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "contexts/authContext";

const UrlContextSync = () => {
  const { academyId: urlAcademyId, schoolId: urlSchoolId } = useParams<{
    academyId: string;
    schoolId: string;
  }>();
  const { currentUser, currentSchool, changeSchool } = useAuth();
  const navigate = useNavigate();
  const changingRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !urlAcademyId || !urlSchoolId) return;
    if (changingRef.current) return;

    if (urlAcademyId !== currentUser.academyId) {
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
