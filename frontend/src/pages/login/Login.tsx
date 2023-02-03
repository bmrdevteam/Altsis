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

import React, { useEffect, useRef, useState } from "react";
import style from "style/pages/login.module.scss";
import axios from "axios";
import Button from "components/button/Button";
import { useNavigate, useParams } from "react-router-dom";
import useGoogleLogin, { GoogleLoginBtn } from "hooks/useGoogleLogin";
import Select from "components/select/Select";
import { useCookies } from "react-cookie";
import useDatabase from "hooks/useDatabase";
import Input from "components/input/Input";
import useApi from "hooks/useApi";
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
   * usernamme and password input
   */
  const [username, setUsername] = useState<string>();
  const [password, setPassword] = useState<string>();

  /**
   * username and password input valid state
   */
  const [usernameInputValid, setUsernameInputValid] = useState<boolean>(true);
  const [passwordInputValid, setPasswordInputValid] = useState<boolean>(true);

  /**
   * to display error messages to the user
   */
  const [errorMessage, setErrorMessage] = useState<string>("");

  /**
   * to indicate when the data from the backend has mounted
   */
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * academies list - from the backend
   */
  const [academies, setAcademies] = useState<any[]>();
  /**
   * the current selected academy
   */
  const [academy, setAcademy] = useState<string>("");

  /**
   * cookies hook
   * {@link https://www.npmjs.com/package/react-cookie}
   */
  const [cookies, setCookie, removeCookie] = useCookies(["academyId"]);

  /**
   * react-router navigation
   */
  const navigate = useNavigate();
  const { AcademyApi } = useApi();
  /** Date for setting the cookie expire date  */
  var date = new Date();
  /** */
  date.setFullYear(date.getFullYear() + 1);

  useEffect(() => {
    AcademyApi.RAcademies().then((res) => {
      setAcademies(res);
      console.log(res);

      setLoading(false);
    });

    /**
     *
     */
    if (pid !== undefined && pid !== "undefined" && pid !== "0") {
      if (cookies.academyId === undefined) {
        /**
         * if the cookie is not yet set, set the cookie with the pid
         */
        setCookie("academyId", pid, {
          path: "/",
          expires: date,
        });

        /**
         * set the current academy
         */
        setAcademy(pid);
      } else {
        /**
         * chech if the cookie matched any academies from the backend
         */
        if (
          !loading &&
          !(
            (academies?.filter((val) => val.academyId === pid) ?? []).length > 0
          )
        ) {
          navigate("/login");
        } else {
          /**
           * else set the academy with the current cookie
           */
          setCookie("academyId", pid, {
            path: "/",
            expires: date,
          });
          setAcademy(pid);
        }
      }
    } else if (pid === "0") {
      navigate(`/${cookies.academyId}/login`);
    } else {
      navigate(`/login`, { replace: true });
    }
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
        /** if the result is a success */

        response.status === 200 && window.location.replace("/");
      })
      .catch((error) => {
        /** if the result is a success */
        const errorMsg = error.response.data.err;
        // console.log(errorMsg);
        setPasswordInputValid(false);
        setUsernameInputValid(false);

        for (let i = 0; i < errorMsg?.length; i++) {
          setErrorMessage(errorMsg[i]?.msg);
        }
      });
  };
  return !loading ? (
    <>
      <div className={style.section}>
        <div className={style.container}>
          <div className={style.title}>
            {
              academies?.filter((val) => val.academyId === academy)[0]
                ?.academyName
            }
          </div>
          <div
            style={{ display: "flex", gap: "12px", flexDirection: "column" }}
          >
            <p className={style.error}>{errorMessage}</p>

            <Input
              invalid={!usernameInputValid}
              label="아이디"
              placeholder="아이디 입력"
              onChange={(e: any) => {
                setUsername(e.target.value);
              }}
              required
              style={{ borderRadius: "8px" }}
            />
            <Input
              invalid={!passwordInputValid}
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
              style={{ borderRadius: "8px" }}
            />

            <Button
              disabled={
                username === undefined ||
                password === undefined ||
                username === "" ||
                password === ""
              }
              onClick={onLoginSubmit}
              style={{ borderRadius: "8px" }}
            >
              로그인
            </Button>
          </div>
          <div style={{ height: "4px" }}></div>

          <Button
            type="ghost"
            onClick={() => {
              navigate("/login", { replace: false });
            }}
            style={{ borderRadius: "8px" }}
          >
            다른 아카데미 선택
          </Button>
          <div style={{ height: "4px" }}></div>
          <GoogleLoginBtn academyId={academy} />
        </div>
      </div>
    </>
  ) : (
    <div className={style.section}></div>
  );
};

export default Login;
