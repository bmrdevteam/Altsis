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
import DragAndDrop, { Drag, Drop } from "components/dragAndDrop/DragAndDrop";
import Tree from "components/tree/Tree";
import useDatabase from "hooks/useDatabase";
type Props = {
  school: any;
};

const Subject = (props: Props) => {
  const [subjects, setSubjects] = useState();
  console.log(props.school);
  
  // const database = useDatabase();

  // async function getSelectedSeason(id: string) {
  //   const result = await database.R({ location: `seasons/${id}` });
  //   return result;
  // }

  // useEffect(() => {
  //   getSelectedSeason().then((res) => {
  //     setSubjects(res);
  //   });
  // }, []);

  function processSubjects(subjectObj: any) {
    const unique: any = Array.from(
      new Set(subjectObj.data.map((val: any) => val[0]))
    );
    let sub1: any = {};
    for (let i = 0; i < unique.length; i++) {
      sub1[unique[i]] = Array.from(
        new Set(
          subjectObj.data
            .filter((val: any) => val[0] === unique[i])
            .map((val: string[]) => val[1])
        )
      );
    }
    let sub2: any = {};
    for (let i = 0; i < unique.length; i++) {
      for (let index = 0; index < sub1[unique[i]].length; index++) {
        sub2[`${unique[i]}/${sub1[unique[i]][index]}`] = Array.from(
          new Set(
            subjectObj.data
              .filter(
                (val: any) =>
                  val[0] === unique[i] && val[1] === sub1[unique[i]][index]
              )
              .map((val: string[]) => val[2])
          )
        );
      }
    }
    return [unique, sub1, sub2];
  }
  return (
    <div style={{ marginTop: "24px" }}>
      {/* <DragAndDrop>
        <Drag />
        <Drop />
      </DragAndDrop> */}
      {/* <Tree data={processSubjects(subjects)} /> */}
    </div>
  );
};

export default Subject;
