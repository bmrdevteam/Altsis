/**
 * @file Seasons - Classrooms - UpdateBulkPopup
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

import React from "react";

// components
import Button from "components/button/Button";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  _id: string;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  classroomListRef: React.MutableRefObject<string[]>;
  setClassroomList: React.Dispatch<React.SetStateAction<string[]>>;
};

function Update(props: Props) {
  const { SeasonAPI } = useAPIv2();

  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        onClick={() => {
          SeasonAPI.USeasonClassrooms({
            params: { _id: props._id },
            data: { classrooms: props.classroomListRef.current },
          })
            .then(({ season }: any) => {
              alert(SUCCESS_MESSAGE);
              props.setClassroomList(season.classrooms);
              props.setPopupActive(false);
            })
            .catch((err) => alert(err.response.data.message));
        }}
        style={{
          borderRadius: "4px",
          height: "32px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
      >
        설정
      </Button>
    </div>
  );
}

export default Update;
