/**
 * @file Seasons - Subjects - UpdateBulkPopup
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
  subjectsRef: React.MutableRefObject<{
    label: string[];
    data: string[][];
  }>;
  setSubjects: (subjects: any) => void;
};

function Update(props: Props) {
  const { SeasonAPI } = useAPIv2();

  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        onClick={() => {
          SeasonAPI.USeasonSubjects({
            params: { _id: props._id },
            data: {
              label: props.subjectsRef.current.label,
              data: props.subjectsRef.current.data,
            },
          })
            .then(({ season }: any) => {
              alert(SUCCESS_MESSAGE);
              props.setSubjects(season.subjects);
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
