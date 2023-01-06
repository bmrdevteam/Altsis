/**
 * @file Notifications Page
 *
 * @author jessie129j <jessie129j@gmail.com>
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

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

// tab
import Inbox from "./mailbox/Inbox";
import Sent from "./mailbox/Sent";

import Tab from "components/tab/Tab";

type Props = {};

const Courses = (props: Props) => {
  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>알림</div>

            <Tab
              items={{
                "받은 알림": <Inbox />,
                "보낸 알림": <Sent />,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Courses;
