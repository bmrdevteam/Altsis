import React, { useEffect, useRef, useState } from "react";
import style from "../style/pages/login.module.scss";
import axios from "axios";
import Button from "../components/button/Button";
import { useNavigate, useParams } from "react-router-dom";

import useGoogleLogin, { GoogleLoginBtn } from "../hooks/useGoogleLogin";
import Select from "../components/select/Select";
import { useCookies } from "react-cookie";
import useDatabase from "../hooks/useDatabase";
import Input from "../components/input/Input";
// import useFormValidation from "../hooks/useFormValidation";

const Login = () => {
  const { pid } = useParams<"pid">();

  const [username, setUsername] = useState<string>();
  const [password, setPassword] = useState<string>();

  const [cookies, setCookie, removeCookie] = useCookies(["academyId"]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [academies, setAcademies] = useState<any[]>();
  const [academy, setAcademy] = useState<string>();

  //later hooks

  //hooks
  const navigate = useNavigate();
  const status = useGoogleLogin();
  const database = useDatabase();
  var date = new Date();

  date.setFullYear(date.getFullYear() + 1);

  async function getAcademis() {
    const { academies: res } = await database.R({
      location: `academies`,
    });
    setLoading(false);
    return res;
  }
  useEffect(() => {
    getAcademis().then((res) => setAcademies(res));

    if (
      pid !== "root" &&
      pid !== undefined &&
      pid !== "undefined" &&
      pid !== "0"
    ) {
      if (cookies.academyId === undefined) {
        setCookie("academyId", pid, {
          path: "/",
          expires: date,
        });
        setAcademy(pid);
      } else {
        //get 아카데미 안에 있는지 확인후 없으면 쿠키 지우고 있는데 현재 쿠키랑 다르면 쿠키 지우고 거기로 이동
        if (
          !loading &&
          !(
            (
              academies?.filter((val) => val.academyId === cookies.academyId) ??
              []
            ).length > 0
          )
        ) {
          navigate("/login");
          navigate(0);
          setLoading(true);
        }
        setAcademy(cookies.academyId);
      }
    }
    if (pid === "0") {
      navigate(`/${cookies.academyId}/login`);
      navigate(0);
    }
    if (pid === "root") {
      setAcademy("관리자");
    }
    if (pid === "undefined") {
      navigate(`/login`);
    }
    if (pid === undefined) {
      removeCookie("academyId");
    }

    return () => {};
  }, [loading]);

  const onLoginSubmit = () => {
    axios
      .post(
        `${process.env.REACT_APP_SERVER_URL}/api/users/login/local`,
        {
          academyId: academy,
          userId: username,
          password: password,
        },
        { withCredentials: true }
      )
      .then(function (response) {
        response.status === 200 && window.location.replace("/");
      })
      .catch((error) => {
        const errorMsg = error.response.data;
        console.log(errorMsg);

        for (let i = 0; i < errorMsg?.length; i++) {
          setErrorMessage(errorMsg[i]?.msg);
        }
      });
  };

  if (academy === undefined) {
    let options: { text: string; value: string }[] = [{ text: "", value: "" }];
    academies?.map((value, index) => {
      options.push({ text: value.academyName, value: value.academyId });
    });
    return !loading ? (
      <>
        <div className={style.section}>
          <div className={style.container}>
            <div className={style.title}> 로그인 아카데미 선택</div>
            <Select
              onchange={(e: any) => {
                if (e !== "") {
                  setCookie("academyId", e, {
                    path: "/",
                    expires: date,
                  });
                  navigate(`/0/login`);
                  navigate(0);
                }
              }}
              options={options}
            />
          </div>
        </div>
      </>
    ) : (
      <div className={style.section}></div>
    );
  }
  return !loading ? (
    <>
      <div className={style.section}>
        <div className={style.container}>
          <div className={style.title}>
            {
              academies?.filter((val) => val.academyId === academy)[0]
                ?.academyName
            }
            에 로그인
          </div>
          <div
            style={{ display: "flex", gap: "12px", flexDirection: "column" }}
          >
            <p className={style.error}>{errorMessage}</p>

            <Input
            
              label="아이디"
              placeholder="아이디 입력"
              onChange={(e: any) => {
                setUsername(e.target.value);
              }}
              required
              style={{borderRadius:"8px"}}
            />
            <Input
              label="패스워드"
              placeholder="패스워드 입력"
              onChange={(e: any) => {
                setPassword(e.target.value);
              }}
              onKeyDown={(e: any) => {
                if (
                  username !== undefined &&
                  password !== undefined &&
                  username !== "" &&
                  password !== "" &&
                  e.key === "Enter"
                ) {
                  onLoginSubmit();
                }
              }}
              type="password"
              required
              style={{borderRadius:"8px"}}
            />

            <Button
              disabled={
                username === undefined ||
                password === undefined ||
                username === "" ||
                password === ""
              }
              onClick={onLoginSubmit}
            styles={{borderRadius:"8px"}}

            >
              로그인
            </Button>
          </div>
          <div style={{ height: "4px" }}></div>

          <Button
            type="ghost"
            onClick={() => {
              navigate("/register", { replace: true });
            }}
            styles={{borderRadius:"8px"}}

          >
            회원가입
          </Button>
          <div style={{ height: "4px" }}></div>
          <GoogleLoginBtn />
        </div>
      </div>
    </>
  ) : (
    <div className={style.section}></div>
  );
};

export default Login;
