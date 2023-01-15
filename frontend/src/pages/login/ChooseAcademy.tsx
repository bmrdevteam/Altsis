import Select from "components/select/Select";
import React, { useEffect, useState } from "react";
import style from "style/pages/login.module.scss";
import { useCookies } from "react-cookie";
import useApi from "hooks/useApi";
import { useNavigate } from "react-router-dom";

type Props = {};

const ChooseAcademy = (props: Props) => {
  const { AcademyApi } = useApi();
  const navigate = useNavigate();
  const [cookies, setCookie, removeCookie] = useCookies(["academyId"]);
  const [academies, setAcademies] = useState<any>([]);
  useEffect(() => {
    AcademyApi.RAcademies().then((res) => {
      setAcademies(res);
    });
  }, []);

  /** Date for setting the cookie expire date  */
  var date = new Date();
  /** */
  date.setFullYear(date.getFullYear() + 1);

  let options: { text: string; value: string }[] = [{ text: "", value: "" }];
  academies?.map((value: any, index: number) => {
    options.push({ text: value.academyName, value: value.academyId });
  });
  return (
    <>
      <div className={style.section}>
        <div className={style.container}>
          <div className={style.title}> 로그인 아카데미 선택</div>
          <Select
            appearence="flat"
            onChange={(e: any) => {
              navigate("/" + e + "/login", { replace: true });
              console.log(e);
            }}
            options={options}
          />
        </div>
      </div>
    </>
  );
};

export default ChooseAcademy;
