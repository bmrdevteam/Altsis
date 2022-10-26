/**
 * @file Schools Pid Page Tab Item - Subject
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
import React, { useEffect, useState } from "react";
import DragAndDrop, {
  Drag,
  Drop,
} from "components/dragAndDrop/DragAndDrop";
type Props = {
  school: any;
};

const Subject = (props: Props) => {
  const [subjects, setSubjects] = useState();

  return (
    <div style={{ marginTop: "24px" }}>
      <DragAndDrop>
        <Drag />
        <Drop />
      </DragAndDrop>
    </div>
  );
};

export default Subject;
