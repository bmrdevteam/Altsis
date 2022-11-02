/**
 * @file Myaccount Index Page
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
 import style from "style/pages/myaccount/myaccount.module.scss";
 import Overview from "./tab/Overview";
 import Course from "./tab/Course";
 import List from "./tab/List";
 import Point from "./tab/Point";
 
 const Myaccount = () => {
  const {currentUser} = useAuth()
   const database = useDatabase();
 
   const [SchoolUsers, setSchoolUsers] = useState<any>();
 
   async function getSchoolUsers() {
    const {registrations : res} = await database.R({ location: `enrollments/${currentUser._id}` });
    console.log(res)
    return res;
   }
   
   useEffect(() => {
    getSchoolUsers().then((res) => {
        setSchoolUsers(res)
        console.log(res)
     });
     return () => {};
   }, []);
 
   return (
     <div className={style.section}>
       <NavigationLinks />
       <div style={{ display: "flex", gap: "24px" }}>
         <div style={{ flex: "1 1 0" }}>
           <div className={style.title}>나의 정보</div>
           <div className={style.description}>
             당신의 정보를 모두 확인 할 수 있습니다.
             {/* {SchoolUsers?.[1].userName} */}
           </div>
         </div>
       </div>
       <div style={{marginBottom: "24px"}}>
       <Tab
        items={{
          기본정보: <Overview usersData={SchoolUsers}/>,
          수업: <Course />,
          리스트: <List />,
          포인트: <Point />
          }}
        align={"flex-start"}
        >
</Tab>
       </div>
     </div>
   );
 };
 
 export default Myaccount;
 