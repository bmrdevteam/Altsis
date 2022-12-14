/**
 * @file Admin Page
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
 * @version 1.0
 *
 */
import style from "style/pages/admin/schools.module.scss";

// components
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Divider from "components/divider/Divider";

const Admin = () => {
  return (
    <div className={style.section}>
      <NavigationLinks />
      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div className={style.title}>관리자 메뉴</div>
          <div className={style.description}>description...</div>
        </div>
      </div>
      <Divider />
    </div>
  );
};

export default Admin;
