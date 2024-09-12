/**
 * @file login Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * Login page
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 *
 */

import { useEffect, useRef, useState } from "react";
import style from "style/pages/login.module.scss";
import Button from "components/button/Button";
import { useNavigate, useParams } from "react-router-dom";
import { useCookies } from "react-cookie";
import Svg from "../../assets/svg/Svg";

import axios from "axios";

import Input from "components/input/Input";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { GoogleLoginBtn } from "hooks/useGoogleLogin";
// import useFormValidation from "../hooks/useFormValidation";

/**
 *
 * login page
 *
 * @returns login page
 *
 * @example <Login/>
 *
 *
 */

const Login = () => {
  /**
   * the page id - to check which academy the user wants to login
   */
  const { pid } = useParams<"pid">();
  const [formData, setFormData] = useState<{}>({
    username: "",
    password: "",
    usernameInputValid: true,
    passwordInputValid: true,
    errorMsg: "",
  });
  /**
   * userId and password input
   */
  const userIdRef = useRef<string>("");
  const passwordRef = useRef<string>("");

  /**
   * username and password input valid state
   */
  const [userIdInputValid, setUserIdInputValid] = useState<boolean>(true);
  const [passwordInputValid, setPasswordInputValid] = useState<boolean>(true);

  /**
   * to display error messages to the user
   */
  const [errorMessage, setErrorMessage] = useState<string>("");

  /**
   * to indicate when the data from the backend has mounted
   */
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * current selected academy - from the backend
   */
  const [academyId, setAcademyId] = useState<string>("");
  const [academyName, setAcademyName] = useState<string>("");
  /**
   * cookies hook
   * {@link https://www.npmjs.com/package/react-cookie}
   */
  const [cookies, setCookie, removeCookie] = useCookies(["academyId"]);

  /**
   * react-router navigation
   */
  const navigate = useNavigate();
  const { AcademyAPI, UserAPI } = useAPIv2();

  /** Date for setting the cookie expire date  */
  var date = new Date();
  /** */
  date.setFullYear(date.getFullYear() + 1);

  const loadAcademyData = async (academyId: string) => {
    AcademyAPI.RAcademy({ query: { academyId } })
      .then(({ academy }) => {
        setAcademyId(academy.academyId);
        setAcademyName(academy.academyName);
        setCookie("academyId", academy.academyId, {
          path: "/",
          expires: date,
        });
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        removeCookie("academyId");
        navigate(`/login`, { replace: true });
      });
  };

  useEffect(() => {
    UserAPI.RMySelf()
      .then(() => {
        // if user is already logged in
        navigate(`/`, { replace: true });
      })
      .catch((err) => {
        setIsLoading(true);
      });
  }, []);

  useEffect(() => {
    if (isLoading) {
      if (!pid || pid === "undefined" || pid === "0") {
        if (cookies.academyId && cookies.academyId !== "0") {
          loadAcademyData(cookies.academyId);
        } else {
          navigate(`/login`, { replace: true });
        }
      } else {
        loadAcademyData(pid);
      }
    }
  }, [isLoading]);

  const onLoginSubmit = async () => {
    try {
      if (userIdRef.current.trim() === "") {
        alert("아이디를 입력해주세요");
        return;
      }
      if (passwordRef.current.trim() === "") {
        alert("비밀번호를 입력해주세요");
        return;
      }
      await UserAPI.LoginLocal({
        data: {
          academyId,
          userId: userIdRef.current,
          password: passwordRef.current,
        },
      });
      window.location.replace("/");
    } catch (err: any) {
      ALERT_ERROR(err);
      switch (err.response?.data?.message) {
        case "USER_NOT_FOUND":
          setUserIdInputValid(false);
          break;
        case "PASSWORD_INCORRECT":
          setUserIdInputValid(true);
          setPasswordInputValid(false);
          break;
      }
    }
  };

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.container}>
          <div className={style.title}>{academyName}</div>
          <div
            style={{ display: "flex", gap: "12px", flexDirection: "column" }}
          >
            <p className={style.error}>{errorMessage}</p>

            <Input
              invalid={!userIdInputValid}
              label="아이디"
              placeholder="아이디 입력"
              onChange={(e: any) => {
                userIdRef.current = e.target.value;
              }}
              required
              style={{ borderRadius: "8px" }}
            />
            <Input
              invalid={!passwordInputValid}
              label="비밀번호"
              placeholder="비밀번호 입력"
              onChange={(e: any) => {
                passwordRef.current = e.target.value;
              }}
              onKeyDown={(e: any) => {
                if (
                  userIdRef.current !== "" &&
                  passwordRef.current !== "" &&
                  e.key === "Enter"
                ) {
                  onLoginSubmit();
                }
              }}
              type="password"
              required
              style={{ borderRadius: "8px" }}
            />

            <Button onClick={onLoginSubmit} style={{ borderRadius: "8px" }}>
              로그인
            </Button>
          </div>
          <div style={{ height: "8px" }}></div>

          <Button
            type="ghost"
            onClick={() => {
              navigate("/login", { replace: false });
            }}
            style={{ borderRadius: "8px", height: "42px" }}
          >
            다른 아카데미 선택
          </Button>
          <div style={{ height: "8px" }}></div>
          <GoogleLoginBtn academyId={academyId} />
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
    </>
  ) : (
    <div className={style.section}></div>
  );
};

export default Login;
