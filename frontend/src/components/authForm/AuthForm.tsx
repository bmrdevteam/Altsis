/**
 * @file auth form
 * 
 * !DISCLAMER! the component will not be supported soon
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - auth form component
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
 * - auth form component -> replaced with input components
 *
 * -------------------------------------------------------
 *
 * NOTES
 * 
 * change the auth form components on the resgister page to input components
 *
 */


import React from "react";
import style from "./authForm.module.scss";

const AuthForm = ({
  children,
  handleSubmit,
}: {
  children?: JSX.Element | JSX.Element[];
  handleSubmit?: any;
}) => {
  return (
    <form
      onSubmit={(e) => {
        handleSubmit(e);
      }}
      className={style.form_container}
    >
      {children}
    </form>
  );
};

const FormInput = ({
  placeholder,
  name,
  useRef,
  required,
  handleChange,
  valueType,
  isValid,
}: {
  placeholder?: string;
  name?: string;
  required?: boolean;
  useRef?: React.MutableRefObject<any>;
  valueType?: string;
  handleChange?: any;
  isValid?:boolean;
}) => {
  return (
    <div className={style.form_input_container}>
      {name && (
        <label
          className={`${style.form_input_lable} ${required && style.required}`}
          htmlFor={name}
        >
          {name}
        </label>
      )}
      <input
        onChange={(e: React.FormEvent<HTMLInputElement>) => {
          handleChange && handleChange(e);
        }}
        type={valueType}
        ref={useRef}
        className={style.form_input}
        placeholder={placeholder}
        name={name}
        required={required}
      />
      {isValid && <p>hello sths wrong</p>}
    </div>
  );
};

const FormRow = ({ children }: { children?: JSX.Element[] | JSX.Element }) => {
  return <div className={style.form_row}>{children}</div>;
};
const FormColumn = ({
  children,
}: {
  children?: JSX.Element[] | JSX.Element;
}) => {
  return <div className={style.form_column}>{children}</div>;
};

const FormSubmit = ({ placeholder }: { placeholder?: string }) => {
  return (
    <input className={style.form_submit} type="submit" value={placeholder} />
  );
};

export default AuthForm;
export { FormInput, FormSubmit, FormRow, FormColumn };
