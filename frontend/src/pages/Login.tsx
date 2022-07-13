import React, { useEffect, useRef, useState } from "react";
import AuthForm, {
  FormInput,
  FormSubmit,
} from "../components/UI/authForm/AuthForm";
import style from "../style/pages/login.module.scss";
import axios from "axios";
import Button from "../components/UI/button/Button";
import { useNavigate } from "react-router-dom";

import useGoogleLogin, { GoogleLoginBtn } from "../hooks/useGoogleLogin";

const Login = () => {
  const usernameRef = useRef<{ value: any }>();
  const passwordRef = useRef<{ value: any }>();
  const [errorMessage, setErrorMessage] = useState<string>("");

  //later hooks

  //hooks
  const navigate = useNavigate();
  const status = useGoogleLogin();

  

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
              name="아이디"
              placeholder="아이디 입력"
              handleChange={(e: React.FormEvent<HTMLInputElement>) => {
                console.log(usernameRef.current?.value);
              }}
              useRef={usernameRef}
              required={true}
            />
            <FormInput
              name="패스워드"
              placeholder="패스워드 입력"
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

          <div style={{ height: "4px" }}></div>
          {!status && <GoogleLoginBtn/>}
        </div>
      </div>
    </>
  );
};

export default Login;
