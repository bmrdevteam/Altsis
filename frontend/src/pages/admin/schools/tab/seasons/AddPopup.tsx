/**
 * @file Schools Pid Page Tab Item - Season - AddPopup
 *
 * @author jessie <jessie129j@gmail.com>
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

import React, { useEffect, useRef, useState } from "react";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import style from "style/pages/admin/schools.module.scss";

import { TSeason } from "types/auth";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import _ from "lodash";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  school: string;
  seasonList: TSeason[];
  setSeasonList: React.Dispatch<React.SetStateAction<TSeason[]>>;
  setSeasonToEdit: React.Dispatch<TSeason>;
  setEditPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const Season = (props: Props) => {
  const { SeasonAPI } = useAPIv2();

  const inputRef = useRef<{
    year: string;
    term: string;
    period: {
      start?: string;
      end?: string;
    };
  }>({ year: "", term: "", period: {} });

  const [selectedSeasonToCopy, setSelectedSeasonToCopy] = useState<{
    _id: string;
    year: string;
    term: string;
  }>();
  const [isLoadingSelectedSeasonToCopy, setIsLoadingSelectedSeasonToCopy] =
    useState<boolean>(false);

  const [selectSeasonToCopyPopupActive, setSelectSeasonToCopyPopupActive] =
    useState<boolean>(false);

  const onClickAddHandler = async () => {
    if (inputRef.current.year === "") {
      return alert("학년도를 입력해주세요");
    }
    if (inputRef.current.term === "") {
      return alert("학기를 입력해주세요");
    }

    try {
      const { season } = await SeasonAPI.CSeason({
        data: {
          school: props.school,
          year: inputRef.current.year,
          term: inputRef.current.term,
          period: inputRef.current.period,
          copyFrom: selectedSeasonToCopy?._id,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setSeasonList((ex) =>
        _.orderBy(
          [...ex, season],
          [
            (s) => new Date(s.period?.start ?? "").getTime(),
            (s) => new Date(s.period?.end ?? "").getTime(),
          ],
          ["desc", "desc"]
        )
      );

      props.setSeasonToEdit(season);
      props.setEditPopupActive(true);
      props.setPopupActive(false);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (isLoadingSelectedSeasonToCopy) {
      setIsLoadingSelectedSeasonToCopy(false);
    }
    return () => {};
  }, [isLoadingSelectedSeasonToCopy]);

  return (
    <>
      <Popup
        setState={props.setPopupActive}
        style={{ maxWidth: "800px", width: "100%" }}
        closeBtn
        title={"학기 추가"}
        contentScroll
      >
        <div>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="학년도"
              required={true}
              onChange={(e: any) => {
                inputRef.current.year = e.target.value.trim();
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <Input
              style={{ maxHeight: "30px" }}
              appearence="flat"
              label="학기"
              onChange={(e: any) => {
                inputRef.current.term = e.target.value.trim();
              }}
              required
            />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="학기 시작"
              type="date"
              onChange={(e: any) => {
                inputRef.current.period.start = e.target.value;
              }}
            />
            <Input
              appearence="flat"
              label="학기 종료"
              type="date"
              onChange={(e: any) => {
                inputRef.current.period.end = e.target.value;
              }}
            />
          </div>
          <div style={{ marginTop: "24px" }}>
            <div className={style.label}>복사할 학기 선택</div>
            <div className={style.description}>
              사용자 등록 정보, 교과목, 강의실, 양식, 권한이 복사됩니다.
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              {!isLoadingSelectedSeasonToCopy && (
                <Input
                  appearence="flat"
                  defaultValue={
                    selectedSeasonToCopy
                      ? `${selectedSeasonToCopy.year} ${selectedSeasonToCopy.term}`
                      : "선택된 학기 없음"
                  }
                  disabled
                />
              )}
              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  setSelectSeasonToCopyPopupActive(true);
                }}
              >
                학기 선택
              </Button>
            </div>
          </div>
          <Button
            type={"ghost"}
            onClick={onClickAddHandler}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              marginTop: "24px",
            }}
          >
            생성
          </Button>
        </div>
      </Popup>
      {selectSeasonToCopyPopupActive && (
        <Popup
          title="복사할 학기 선택"
          setState={setSelectSeasonToCopyPopupActive}
          closeBtn
          contentScroll
          footer={
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
              onClick={() => {
                setSelectedSeasonToCopy(undefined);
                setIsLoadingSelectedSeasonToCopy(true);
                setSelectSeasonToCopyPopupActive(false);
              }}
            >
              선택하지 않고 진행하기
            </Button>
          }
        >
          <Table
            type="object-array"
            data={props.seasonList}
            control
            defaultPageBy={10}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "학년도",
                key: "year",
                type: "text",
                textAlign: "center",
              },
              {
                text: "학기",
                key: "term",
                type: "text",
                textAlign: "center",
              },
              {
                text: "선택",
                key: "select",
                type: "button",
                onClick: (e: any) => {
                  setSelectedSeasonToCopy(e);
                  setIsLoadingSelectedSeasonToCopy(true);
                  setSelectSeasonToCopyPopupActive(false);
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "black",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
};

export default Season;
