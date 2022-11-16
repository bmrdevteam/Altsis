import Navbar from "layout/navbar/Navbar";
import React from "react";
import style from "style/pages/archive.module.scss";
type Props = {};

const Archive = (props: Props) => {
  return (
    <>
      <Navbar />
      <div className={style.section}>Archive</div>
    </>
  );
};

export default Archive;
