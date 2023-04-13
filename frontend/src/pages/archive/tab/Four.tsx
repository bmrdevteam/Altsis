import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import { useRef, useEffect, useState } from "react";
import useApi from "hooks/useApi";
import { useParams } from "react-router-dom";
import Loading from "components/loading/Loading";

type Props = {
  registrationList: any[];
};

const colors = ["#ff595e", "#2c6e49", "#1982c4", "#6a4c93"];

const One = (props: Props) => {
  const { ArchiveApi } = useApi();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [archiveListFlattened, setArchiveListFlattened] = useState<any[]>([]);
  const archiveListFlattenedRef = useRef<any>([]);
  const [userNameStatus, setUserNameStatus] = useState<{
    [key: string]: { text: string; color: string };
  }>({});

  useEffect(() => {
    if (pid) {
      setIsLoading(true);
    }
  }, [props.registrationList, pid]);

  useEffect(() => {
    if (isLoading && pid) {
      if (props.registrationList.length > 0) {
        ArchiveApi.RArchivesByRegistrations({
          registrationIds: props.registrationList.map(
            (registration: any) => registration._id
          ),
          label: pid,
        })
          .then((res) => {
            const archiveListFlattened = [];
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
                archiveListFlattened.push({
                  ...archive.data[pid][idx],
                  _id: archive._id,
                });
              }
            }
            setArchiveList(res);
            setUserNameStatus(userNameStatus);
            setArchiveListFlattened(archiveListFlattened);
            archiveListFlattenedRef.current = archiveListFlattened;
          })
          .then(() => {
            setIsLoading(false);
          });
      } else {
        setArchiveList([]);
        setUserNameStatus({});
        setArchiveListFlattened([]);
        archiveListFlattenedRef.current = [];
        setIsLoading(false);
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
  }, [isLoading]);

  // const data = useRef;
  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  const update = async () => {
    if (archiveListFlattenedRef.current.length > 0 && pid) {
      const archiveById: { [key: string]: any[] } = {};
      for (let _archive of archiveListFlattenedRef.current) {
        if (!archiveById[_archive._id]) archiveById[_archive._id] = [];
        const archive: { [key: string]: string | number } = {};
        formArchive().fields?.map((val: any) => {
          archive[val.label] = _archive[val.label];
        });
        archiveById[_archive._id].push(archive);
      }
      const archives: { _id: string; data: any[] }[] = Object.keys(
        archiveById
      ).map((_id: string) => {
        return {
          _id,
          data: archiveById[_id],
        };
      });

      ArchiveApi.UArchives({ label: pid, archives }).then((res) => {
        setIsLoading(true);
        alert(SUCCESS_MESSAGE);
      });
    }
  };

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
    arr.push({
      text: "수정",
      type: "rowEdit",
      width: "72px",
      textAlign: "center",
      fontSize: "12px",
      btnStyle: {
        round: true,
        border: true,
        padding: "4px",
        color: "red",
        background: "#FFF1F1",
      },
      fontWeight: "600",
    });
    return arr;
  }

  return !isLoading ? (
    <>
      {archiveListFlattened.length !== 0 && (
        <Button
          type="ghost"
          style={{ marginTop: "24px", borderColor: "red" }}
          onClick={() => {
            update();
          }}
        >
          저장
        </Button>
      )}
      <div style={{ marginTop: "24px" }}>
        <Table
          defaultPageBy={10}
          control
          onChange={(value) => {
            /* if value is updated */
            if (value.length === archiveListFlattenedRef.current.length) {
              archiveListFlattenedRef.current = value;
              return;
            }
            /* if value is added or removed */
            /* if value is added */
            if (value.length > archiveListFlattenedRef.current.length) {
              if (archiveList.length === 0) {
                alert("학생을 먼저 선택해주세요");
                setIsLoading(true);
                return;
              }
              if (value[value.length - 1]._id === "") {
                const base = value[value.length - 1];
                value.splice(value.length - 1, 1);
                for (let archive of archiveList) {
                  value.push({ ...base, _id: archive._id });
                }
              }
            }
            archiveListFlattenedRef.current = value;
            return update();
          }}
          type="object-array"
          data={archiveListFlattened ?? []}
          header={archiveHeader()}
        />
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default One;
