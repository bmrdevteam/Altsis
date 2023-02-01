import Select from "components/select/Select";
import React, { useEffect, useRef, useState } from "react";
import style from "style/pages/login.module.scss";
import { useCookies } from "react-cookie";
import useApi from "hooks/useApi";
import { useNavigate } from "react-router-dom";
import Input from "components/input/Input";
import Button from "components/button/Button";

type Props = {};

const ChooseAcademy = (props: Props) => {
  const { AcademyApi } = useApi();
  const navigate = useNavigate();
  const formData = useRef<{ academyId: string }>({ academyId: "" });
  const [cookies, setCookie, removeCookie] = useCookies(["academyId"]);
  const [academies, setAcademies] = useState<any>([]);
  useEffect(() => {
    AcademyApi.RAcademies().then((res) => {
      setAcademies(res);
    });
    removeCookie("academyId");
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
          <div className={style.title}> 로그인 아카데미 입력</div>
          {/* <Select
            appearence="flat"
            onChange={(e: any) => {
              navigate("/" + e + "/login", { replace: true });
              console.log(e);
            }}
            options={options}
          /> */}
          <Input
            appearence="flat"
            type="text"
            onChange={(e: any) => {
              formData.current.academyId = e.target.value;
            }}
          />
          <div style={{ marginTop: "24px" }}></div>
          <Button
            type="ghost"
            onClick={() => {
              navigate("/" + formData.current.academyId + "/login", {
                replace: true,
              });
            }}
          >
            입력
          </Button>
        </div>
      </div>
    </>
  );
};

export default ChooseAcademy;
