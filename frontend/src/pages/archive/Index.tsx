import { useEffect, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";

import style from "style/pages/archive.module.scss";

import { useAuth } from "contexts/authContext";
import Loading from "components/loading/Loading";

type Props = {};

const Archive = (props: Props) => {
  const navigate = useAppNavigate();
  const { currentSchool, currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      if (currentSchool?._id && currentSchool.formArchive) {
        const isManager = currentUser?.auth === "manager";
        const formArchive = currentSchool.formArchive.filter(
          (form: any) =>
            (form.authTeacher && form.authTeacher !== "undefined") ||
            (isManager && form.authManager === "viewAndEdit")
        );
        if (formArchive.length !== 0) {
          navigate(formArchive[0].label);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>기록</div>
            <div className={style.description}>
              조회 가능한 기록이 없습니다. <br />
              학교 관리자에게 문의해주세요.
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default Archive;
