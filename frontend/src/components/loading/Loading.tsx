import React from "react";
import Svg from "../../assets/svg/Svg";
import style from "./loading.module.scss";
type Props = {};

const Loading = (props: Props) => {
  return (
    <div className={style.loading}>
      <div className={style.icon}>
        <Svg type={"loading"} width={"48px"} height={"48px"} />
      </div>
      <div className={style.text}>로딩중</div>
    </div>
  );
};

export default Loading;
