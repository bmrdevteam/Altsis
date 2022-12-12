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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

// components
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import Button from "components/button/Button";

// tab
import Inbox from "./tab/Inbox/Index";
import Sent from "./tab/Sent/Index";

import _ from "lodash";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Tab from "components/tab/Tab";

type Props = {};

const Courses = (props: Props) => {
  return (
    <div className={style.section}>
      <Navbar />

      <Tab
        items={{
          "받은 알림": <Inbox />,
          "보낸 알림": <Sent />,
        }}
      />
    </div>
  );
};

export default Courses;
