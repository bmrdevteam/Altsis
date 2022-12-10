import React from 'react'
import Navbar from "layout/navbar/Navbar";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import style from "style/pages/apps/apps.module.scss";

type Props = {}

const classroom = (props: Props) => {
  return (
    <>
      <Navbar />
        <div className={style.section}>
          <NavigationLinks />
              <div style={{ display: "flex", gap: "24px" }}>
                <div style={{ flex: "1 1 0" }}>
                  <div className={style.title}>강의실</div>
                  <div className={style.description}>
                    강의실을 예약 할 수 있습니다.
                  </div>
                </div>
              </div>
        </div>
    </>
  )
}

export default classroom