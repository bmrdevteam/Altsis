import React from "react";
import style from "../../editor.module.scss";

interface SubSectionProps {
  label: string;
  children: React.ReactNode;
}

const SubSection = ({ label, children }: SubSectionProps) => {
  return (
    <div className={style.sub_section}>
      <div className={style.sub_section_label}>{label}</div>
      <div className={style.sub_section_body}>{children}</div>
    </div>
  );
};

export default SubSection;
