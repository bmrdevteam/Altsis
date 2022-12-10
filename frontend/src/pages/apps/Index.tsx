/**
 * @file Apps Index Page
 *
 * @author mrgoodway <mrgoodway@gmail.com>
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
 import { useAuth } from "contexts/authContext";
 import Tab from "components/tab/Tab";
 import NavigationLinks from "components/navigationLinks/NavigationLinks";
 import useDatabase from "hooks/useDatabase";
 import style from "style/pages/apps/apps.module.scss";
 import Overview from "./tab/Overview";
 import List from "./tab/List";
 import Point from "./tab/Point";
 import Nav from "layout/sidebar/sidebar.components";
 import Navbar from "layout/navbar/Navbar";
 
 const Apps = () => {
   return (
   <>
    <Navbar />
     <div className={style.section}>
       <NavigationLinks />
       <div style={{ display: "flex", gap: "24px" }}>
         <div style={{ flex: "1 1 0" }}>
           <div className={style.title}>앱</div>
           <div className={style.description}>
             리스트와 포인트를 활용하여 앱을 만들 수 있습니다.
           </div>
         </div>
       </div>
       <div style={{marginBottom: "24px"}}>
        <Tab
          items={{
            앱: <Overview />,
            리스트: <List />,
            포인트: <Point />
            }}
          align={"flex-start"}
          >
        </Tab>
       </div>
     </div>
     </>
   );
 };
 
 export default Apps;
 