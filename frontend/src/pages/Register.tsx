import React, { useRef, useState } from "react";
import style from "../style/pages/login.module.scss";
import AuthForm, {
  FormColumn,
  FormInput,
  FormSubmit,
} from "../components/UI/authForm/AuthForm";
import axios from "axios";
import Button from "../components/UI/button/Button";
import useGoogleLogin from "../hooks/useGoogleLogin";

type Props = {};

const Register = (props: Props) => {
  const usernameRef = useRef<{ value: any }>();
  const emailRef = useRef<{ value: any }>();
  const passwordRef = useRef<{ value: any }>();
  const passwordCheckRef = useRef<{ value: any }>();

  const [errorMessage, setErrorMessage] = useState<string>("");

  const status = useGoogleLogin();

  const onLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
        <AuthForm handleSubmit={onLoginSubmit}>
          <FormColumn>
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
              name="이메일"
              placeholder="이메일 입력"
              valueType="email"
              useRef={emailRef}
              required
            />
          </FormColumn>
          <FormColumn>
            <FormInput
              name="패스워드"
              placeholder="패스워드 입력"
              valueType="password"
              required
              useRef={passwordRef}
            />
            <FormInput
              name="패스워드 확인"
              placeholder="패스워드 제 입력"
              valueType="password"
              required
              useRef={passwordCheckRef}
            />
          </FormColumn>
          <FormSubmit placeholder="회원가입" />
        </AuthForm>
        <div style={{ height: "4px" }}></div>
        {!status && (
          <>
            <div
              id="g_id_onload"
              data-client_id="665087754874-oavhcdb53mlmsvt1r4rasarl7pbin48j.apps.googleusercontent.com"
              // data-login_uri="http://localhost:3000/user/google/oauth"

              data-auto_prompt={false}
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
  );
};

export default Register;
