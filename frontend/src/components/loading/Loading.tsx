/**
 * @file Loading Component
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
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
import Svg from "../../assets/svg/Svg";
import style from "./loading.module.scss";
/**
 * Loading Component
 * 
 * displays a loading screen while preparing components
 * 
 * @returns Loading Component
 */
const Loading = () => {
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
