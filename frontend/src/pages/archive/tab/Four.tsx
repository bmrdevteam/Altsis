import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import { useRef, useEffect, useState } from "react";
import useApi from "hooks/useApi";
import { useParams } from "react-router-dom";

type Props = {
  registrationList: any[];
  aid?: string;
  pid?: string;
};

const colors = ["#ff595e", "#2c6e49", "#1982c4", "#6a4c93"];

const One = (props: Props) => {
  const { ArchiveApi } = useApi();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool } = useAuth();

  const dataRef = useRef<any>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const archiveListRef = useRef<any>([]);
  const [userNameStatus, setUserNameStatus] = useState<{
    [key: string]: { text: string; color: string };
  }>({});

  useEffect(() => {
    if (props.registrationList.length > 0 && pid) {
      dataRef.current = [];

      if (props.registrationList.length > 0 && pid) {
        ArchiveApi.RArchivesByRegistrations({
          registrationIds: props.registrationList.map(
            (registration: any) => registration._id
          ),
          label: pid,
        })
          .then((res) => {
            const archiveList = [];
            const userNameStatus: {
              [key: string]: { text: string; color: string };
            } = {};

            for (let i = 0; i < res.length; i++) {
              const archive = res[i];

              if (!userNameStatus[archive._id]) {
                userNameStatus[archive._id] = {
                  text: archive.userName,
                  color: colors[i % 4],
                };
              }
              if (!archive.data[pid]) {
                archive.data[pid] = [];
              }
              for (let idx = 0; idx < archive.data[pid].length; idx++) {
                archiveList.push({
                  ...archive.data[pid][idx],
                  _id: archive._id,
                });
              }
            }
            setUserNameStatus(userNameStatus);
            setArchiveList(archiveList);
            archiveListRef.current = archiveList;
          })
          .then(() => {
            setIsLoading(false);
          });
      }

      // if (props.aid !== "") {
      //   ArchiveApi.RArchiveByLabel(props.aid ?? "", { label: props.pid ?? "" })
      //     .then((res) => {
      //       const data = res.data?.[props.pid ?? ""];
      //       if (data) {
      //         setArchiveData(data);
      //         dataRef.current = data;
      //       }
      //     })
      //     .then(() => setIsLoadingArchive(false));
      // } else {
      //   setIsLoadingArchive(false);
      // }
    }
  }, [props.registrationList, pid]);

  // const data = useRef;
  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  function archiveHeader() {
    let arr: any = [
      {
        text: "이름",
        whiteSpace: "pre",
        key: "_id",
        type: "status",
        width: "124px",
        textAlign: "center",
        status: userNameStatus,
        fontWeight: "600",
      },
    ];
    formArchive().fields?.map((val: any) => {
      if (val.type === "select") {
        arr.push({
          text: val.label,
          whiteSpace: "pre",
          key: val.label,
          type: "select",
          option: val.options,
        });
      } else if (val.type === "input-number") {
        arr.push({
          text: val.label,
          whiteSpace: "pre",
          key: val.label,
          type: "input-number",
        });
      } else {
        arr.push({
          byteCalc: true,
          text: val.label,
          key: val.label,
          type: val.type,
        });
      }
    });
    return arr;
  }

  return !isLoading ? (
    <>
      <Button
        type="ghost"
        style={{ marginTop: "24px", borderColor: "red" }}
        onClick={() => {
          const archives: { [key: string]: any[] } = {};
          for (let _archive of archiveListRef.current) {
            if (!archives[_archive._id]) archives[_archive._id] = [];
            const archive: { [key: string]: string | number } = {};
            formArchive().fields?.map((val: any) => {
              archive[val.label] = _archive[val.label];
            });
            archives[_archive._id].push(archive);
          }
          console.log(archives);
          // setIsLoading(true)
          // if (props.pid && props.aid) {
          //   ArchiveApi.UArchive({
          //     _id: props.aid,
          //     data: { [props.pid]: dataRef.current },
          //   }).then((res) => {
          //     setIsLoading(true);
          //     alert(SUCCESS_MESSAGE);
          //   });
          // }
        }}
      >
        저장
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          control
          onChange={(value) => {
            archiveListRef.current = value;
          }}
          type="object-array"
          data={archiveList ?? []}
          header={archiveHeader()}
        />
      </div>
    </>
  ) : (
    <div>loading...</div>
  );
};

export default One;
