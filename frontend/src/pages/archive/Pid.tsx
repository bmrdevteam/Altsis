import Tab from "components/tab/Tab";
import Navbar from "layout/navbar/Navbar";
import React from "react";
import { useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import Group from "./tab/Group";
import One from "./tab/One";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams();
  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>
        <Tab
          items={{
            "학생별 입력": <One />,
            "그룹별 입력": <Group />,
          }}
        />
      </div>
    </>
  );
};

export default ArchiveField;
