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

  /**
   * database hook
   */
  const database = useDatabase();
  /** Date for setting the cookie expire date  */
  var date = new Date();
  /** */
  date.setFullYear(date.getFullYear() + 1);

  /**
   * get academies from the backend
   *
   * @async
   *
   * @returns list of academies
   */
  async function getAcademis() {
    const { academies: res } = await database.R({
      location: `academies`,
    });
    setLoading(false);
    return res;
  }

  useEffect(() => {
    getAcademis().then((res) => setAcademies(res));

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
            (
              academies?.filter((val) => val.academyId === cookies.academyId) ??
              []
            ).length > 0
          )
        ) {
          /**
           * if there are no matches
           * return to the select academy page
           * and ,,, reload? - werid behavior - not moving
           */
          navigate("/login");
          navigate(0);

          /**
           * to get the academy list again
           */
          setLoading(true);
        } else {
          /**
           * else set the academy with the current cookie
           */
          setAcademy(cookies.academyId);
        }
      }
    }
    /**
     * if the pid is 0 redirect the user to the login page using the cookie
     * and ... reload
     */
    if (pid === "0") {
      navigate(`/${cookies.academyId}/login`);
      navigate(0);
    }
    /**
     * if the pid is "undefined" due to the cookie being undefined
     */
    if (pid === "undefined") {
      navigate(`/login`);
    }
    /**
     * if the pid is undefined that is frontend/login
     */
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

  if (academy === undefined || academy === "") {
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
              appearence="flat"
              onChange={(e: any) => {
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
              navigate(0);
            }}

            style={{ borderRadius: "8px" }}
          >
            다른 아카데미에 로그인
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
