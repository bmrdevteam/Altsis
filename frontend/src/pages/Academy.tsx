import { AcademyList } from "../dummyData/AcademyList";
import style from "../style/pages/academy.module.scss";

type Props = {};

const Academy = (props: Props) => {
  return (
    <div className={style.page_container}>
      <div className={style.page_title}>아카데미 관리</div>

      <div className={style.list_container}>
        <div className={style.list}>
          {AcademyList.map((value, index) => {
            return (
              <div className={style.list_row}>
                <div className={style.column_1}>
                  <div className={style.title}>{value.academyName}</div>
                  <div className={style.info}>
                    사용자 수 : {value.userCount}
                  </div>
                </div>
                <div className={style.column_2}>
                  <div className={style.more_info}>자세히</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Academy;
