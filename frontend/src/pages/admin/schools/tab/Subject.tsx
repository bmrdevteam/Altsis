import React, { useEffect, useState } from "react";
import DragAndDrop, {
  Drag,
  Drop,
} from "../../../../components/dragAndDrop/DragAndDrop";
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
