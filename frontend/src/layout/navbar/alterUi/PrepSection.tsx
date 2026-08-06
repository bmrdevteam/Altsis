import { ReactNode } from "react";
import PrepHint from "./PrepHint";
import style from "../Alter.module.scss";

type Props = {
  label?: string;
  hint?: string;
  children: ReactNode;
};

const PrepSection = ({ label, hint, children }: Props) => (
  <div className={style.prepCard}>
    {label ? (
      <p className={style.prepLabel}>
        {label}
        {hint ? <PrepHint text={hint} /> : null}
      </p>
    ) : null}
    {children}
  </div>
);

export default PrepSection;
