import React, { useEffect, useRef, useState } from "react";
import AuthForm, {
  FormInput,
  FormSubmit,
} from "../components/authForm/AuthForm";
import style from "../style/pages/login.module.scss";
import axios from "axios";
import Button from "../components/button/Button";
import { useNavigate, useParams } from "react-router-dom";

import useGoogleLogin, { GoogleLoginBtn } from "../hooks/useGoogleLogin";
import Select from "../components/select/Select";
import { useCookies } from "react-cookie";
import useDatabase from "../hooks/useDatabase";
// import useFormValidation from "../hooks/useFormValidation";

const Login = () => {
  const { pid } = useParams<"pid">();

  const usernameRef = useRef<{ value: any }>();
  const passwordRef = useRef<{ value: any }>();

  const [cookies, setCookie, removeCookie] = useCookies(["academyId"]);
  const [errorMessage, setErrorMessage] = useState<string>("");
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
      location: `/academies/list`,
    });
    return res;
  }

  useEffect(() => {
    getAcademis().then((res) => console.log(res));

    console.log(pid);

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
  }, []);

  const onLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    axios
      .post(
        `${process.env.REACT_APP_SERVER_URL}/api/users/login/local`,
        {
          academyId: academy,
          userId: usernameRef.current?.value,
          password: passwordRef.current?.value,
        },
        { withCredentials: true }
      )
      .then(function (response) {
        response.status === 200 && window.location.replace("/");
      })
      .catch(function (error) {
        const errorMsg = error.response.data.errors;

        for (let i = 0; i < errorMsg?.length; i++) {
          console.log(errorMsg[i]?.msg);
          console.log(errorMsg[i]?.param);
          setErrorMessage(errorMsg[i]?.msg);

          switch (errorMsg[i]?.msg) {
            case "409":
              //conflict
              break;
            case "ID length error":
              console.log(1);

              break;
            case "ID must be alphanumeric":
              console.log(2);

              break;
            case "Password length error":
              console.log(3);

              break;
            case "Password must contain one special character":
              console.log(4);

              break;

            default:
          }
        }
      });
  };
  console.log(academy);

  if (academy === undefined) {
    return (
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
              options={[
                { text: "", value: "" },
                { text: "별무리학교", value: "bmr2" },
              ]}
            />
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className={style.section}>
        <div className={style.container}>
          <div className={style.title}>{academy} 로그인</div>
          <p className={style.error}>{errorMessage}</p>
          <AuthForm handleSubmit={onLoginSubmit}>
            <div style={{ height: "12px" }}></div>
            <div style={{ height: "12px" }}></div>
            <FormInput
              name="아이디"
              placeholder="아이디 입력"
              useRef={usernameRef}
              required={true}
            />
            <FormInput
              name="패스워드"
              placeholder="패스워드 입력"
              valueType="password"
              useRef={passwordRef}
              required
            />

            <FormSubmit placeholder="로그인" />
          </AuthForm>
          <div style={{ height: "4px" }}></div>
          <Button
            type="ghost"
            onClick={() => {
              navigate("/register", { replace: true });
            }}
          >
            회원가입
          </Button>

          <div style={{ height: "4px" }}></div>
          <GoogleLoginBtn />
        </div>
      </div>
    </>
  );
};

export default Login;
