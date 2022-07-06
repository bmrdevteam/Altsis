import React, { useRef } from "react";
import Form, { FormInput, FormSubmit } from "../components/UI/form/Form";
import style from "../style/pages/login.module.scss";

const Login = () => {
  const usernameRef = useRef<{ value: any }>();

  console.log(usernameRef);
  return (
    <div className={style.container}>
      <Form
        handleSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          return console.log("s");
        }}
      >
        <FormInput
          name="username"
          placeholder="username"
          handleChange={(e: React.FormEvent<HTMLInputElement>) => {
            console.log(usernameRef.current?.value);
          }}
          useRef={usernameRef}
          required={true}
        />
        <FormInput name="이름" placeholder="name" />
        <FormInput name="이메일" placeholder="email" />
        <FormInput name="sdf" placeholder="password" />
        <FormSubmit placeholder="로그인" />
      </Form>
    </div>
  );
};

export default Login;
