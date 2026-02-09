import { useAuth } from "contexts/authContext";
import style from "style/pages/settings/settings.module.scss";

const SchoolSettings = () => {
  const { currentUser } = useAuth();

  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>등록된 학교</div>
      {currentUser.schools?.map((value: any, index: number) => {
        return (
          <div
            key={index}
            className={`${style.setting_item} ${style.setting_item_card}`}
          >
            <div className={style.info}>
              <label className={style.label}>{value?.schoolName}</label>
              <span className={style.description}>{value?.schoolId}</span>
            </div>
            <div className={style.controls}></div>
          </div>
        );
      })}
    </div>
  );
};

export default SchoolSettings;
