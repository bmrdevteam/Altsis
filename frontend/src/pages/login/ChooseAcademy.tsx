import { useEffect, useRef, useState } from "react";
import style from "style/pages/login.module.scss";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import Svg from "../../assets/svg/Svg";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

// components
import Input from "components/input/Input";
import Button from "components/button/Button";

type Props = {};

const ChooseAcademy = (props: Props) => {
  const navigate = useNavigate();
  const [, , removeCookie] = useCookies(["academyId"]);
  const { AcademyAPI, UserAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const formData = useRef<{ academyId: string }>({ academyId: "" });

  /** Date for setting the cookie expire date  */
  var date = new Date();
  date.setFullYear(date.getFullYear() + 1);

  useEffect(() => {
    if (isLoading) {
      UserAPI.RMySelf()
        .then(() => {
          // if user is already logged in
          navigate(`/`, { replace: true });
        })
        .catch((err) => {
          removeCookie("academyId");
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  return !isLoading ? (
    <div className={style.section}>
      <div className={style.container}>
        <div className={style.title}>Altsis</div>
        <div className={style.subtitle}>입장하실 아카데미 아이디를 입력하세요.</div>
        <Input
          appearence="flat"
          type="text"
          placeholder="아카데미 ID"
          onChange={(e: any) => {
            formData.current.academyId = e.target.value;
          }}
        />
        <div style={{ marginTop: "24px" }}></div>
        <Button
          type="ghost"
          onClick={() => {
            AcademyAPI.RAcademy({
              query: { academyId: formData.current.academyId.trim() },
            })
              .then(({ academy }) => {
                navigate("/" + academy.academyId + "/login", {
                  replace: true,
                });
              })
              .catch((err) => {
                ALERT_ERROR(err);
              });
          }}
        >
          입장
        </Button>
      </div>
      <div className={style.container_logo}>
        <div className={style.logo}
          onClick={() => {
            window.open("https://github.com/bmrdevteam/Altsis", "_blank");
        }}>
            <Svg type={"github"} width="40px" height="40px" text-align ="center" style={{textAlign : "center"}}/>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default ChooseAcademy;
