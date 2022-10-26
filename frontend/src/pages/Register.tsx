/**
 * @file Register Page
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * 
 * - Register Page
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
 */

import React, { useEffect, useRef, useState } from "react";
import style from "../style/pages/login.module.scss";
import axios from "axios";
import useGoogleLogin, { GoogleLoginBtn } from "../hooks/useGoogleLogin";
import Input from "../components/input/Input";
import Button from "../components/button/Button";

type Props = {};

const Register = (props: Props) => {
  const usernameRef = useRef<{ value: any }>();
  const emailRef = useRef<{ value: any }>();
  const passwordRef = useRef<{ value: any }>();
  const passwordCheckRef = useRef<{ value: any }>();

  const [errorMessage, setErrorMessage] = useState<string>("");
  // const status = useGoogleLogin();

  useEffect(() => {
    console.log("first");

    return () => {
      // console.log(status);
    };
  }, []);

  const onRegisterFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    axios
      .post("http://localhost:3000/api/user/register", {
        userId: usernameRef.current?.value,
        password: passwordRef.current?.value,
        email: emailRef.current?.value,
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
    <div className={style.section}>
      <div className={style.container}>
        <h1 className={style.title}>회원가입</h1>
        <p className={style.error}>{errorMessage}</p>
        <Input

          placeholder="아이디 입력"
          onChange={(e: React.FormEvent<HTMLInputElement>) => {
            console.log(usernameRef.current?.value);
          }}
          required={true}
        />
        <Input

          placeholder="이메일 입력"
          type="email"
          required
        />
        <Input

          placeholder="패스워드 입력"
          type="password"
          required

        />
        <Input

          placeholder="패스워드 제 입력"
          type="password"
          required
        />
        <Button>회원 가입</Button>
        <div style={{ height: "4px" }}></div>
        {/* <GoogleLoginBtn /> */}
      </div>
    </div>
  );
};

export default Register;
