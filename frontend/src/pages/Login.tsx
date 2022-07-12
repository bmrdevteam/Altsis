import React, { useEffect, useRef, useState } from "react";
import AuthForm, {
  FormInput,
  FormSubmit,
} from "../components/UI/authForm/AuthForm";
import style from "../style/pages/login.module.scss";
import axios from "axios";
import Button from "../components/UI/button/Button";
import { useNavigate } from "react-router-dom";

import useGoogleLogin from "../hooks/useGoogleLogin";

const Login = () => {
  const usernameRef = useRef<{ value: any }>();
  const passwordRef = useRef<{ value: any }>();
  const [errorMessage, setErrorMessage] = useState<string>("");

  //later hooks

  //hooks
  const navigate = useNavigate();
  const status = useGoogleLogin();
  console.log(status);

  useEffect(() => {
    return () => {
      axios
        .get("http://localhost:3000/api/test/test1")
        .then(function (response) {
          console.log(response);
        })
        .catch(function (error) {})
        .then(function () {});
    };
  }, []);

  // axios
  //   .post("/api/test/test1", {
  //     username: "",
  //     password: "",
  //   })
  //   .then(function (response) {
  //     console.log(response);
  //   })
  //   .catch(function (error) {
  //     console.log(error);
  //   });

  const onLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    axios
      .post("http://localhost:3000/api/user/register", {
        userId: usernameRef.current?.value,
        password: passwordRef.current?.value,
      })
      .then(function (response) {
        console.log(response);
      })
      .catch(function (error) {
        const errorMsg = error.response.data.errors;

        for (let i = 0; i < errorMsg.length; i++) {
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

  return (
    <>
      <div className={style.section}>
        <div className={style.container}>
          <h1 className={style.title}>로그인</h1>
          <p className={style.error}>{errorMessage}</p>
          <AuthForm handleSubmit={onLoginSubmit}>
            <FormInput
              name="username"
              placeholder="username or email"
              handleChange={(e: React.FormEvent<HTMLInputElement>) => {
                console.log(usernameRef.current?.value);
              }}
              useRef={usernameRef}
              required={true}
            />
            <FormInput
              name="password"
              placeholder="password"
              valueType="password"
              required
            />

            <FormSubmit placeholder="로그인" />
          </AuthForm>
          <div style={{ height: "4px" }}></div>
          <Button
            type="ghost"
            handleClick={() => {
              navigate("/register", { replace: true });
            }}
          >
            회원가입
          </Button>
          {/* <Button
          type="ghost"
          handleClick={() => {
            window.open(
              "http://localhost:3000/api/user/google/login",
              "google로 로그인",
              "width=430,height=500,location=no,status=no,scrollbars=yes"
            );
          }}
        >
          google 로 로그인
        </Button> */}

          <div style={{ height: "4px" }}></div>
          {!status && (
            <>
              <div
                id="g_id_onload"
                data-client_id="665087754874-oavhcdb53mlmsvt1r4rasarl7pbin48j.apps.googleusercontent.com"
                data-login_uri="http://localhost:3001/login"
              ></div>
              <div
                style={{ display: "flex", justifyContent: "center" }}
                className="g_id_signin"
                data-type="standard"
                data-size="large"
                data-theme="outline"
                data-text="sign_in_with"
                data-shape="rectangular"
                data-logo_alignment="center"
              ></div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
