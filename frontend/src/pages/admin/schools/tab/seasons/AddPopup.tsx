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

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import _ from "lodash";
import { TSeason, TSeasonWithRegistrations } from "types/seasons";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  school: string;
  seasonList: TSeason[];
  setSeasonList: React.Dispatch<React.SetStateAction<TSeason[]>>;
  setSeasonToEdit: React.Dispatch<
    React.SetStateAction<TSeasonWithRegistrations | undefined>
  >;
  setEditPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const Season = (props: Props) => {
  const { SeasonAPI } = useAPIv2();
  const fileInput = useRef<HTMLInputElement | null>(null);

  /**
   * upload json data
   * @returns upload json data & create form
   */
  
  const handleProfileUploadButtonClick = () => {
    if (fileInput.current) fileInput.current.click();
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (ev: any) => {
        try {
          const data = JSON.parse(ev.target.result);
          // 파일에서 가져온 데이터는 uploadedSeasonData에 저장
          setUploadedSeasonData(data);
          // 표시용으로 year, term만 설정 (_id는 사용하지 않음)
          setSelectedSeasonToCopy({
            _id: "", // 빈 문자열로 설정 (copyFrom 대신 copyFromData 사용)
            year: data.year || "가져온 학기",
            term: data.term || "",
          });
          setIsLoadingSelectedSeasonToCopy(true);
          setSelectSeasonToCopyPopupActive(false);
          alert(SUCCESS_MESSAGE);
        } catch (err) {
          ALERT_ERROR(err);
          setUploadedSeasonData(null);
        }
      };

      reader.onerror = (err) => {
        ALERT_ERROR(err);
        setUploadedSeasonData(null);
      };

      reader.readAsText(file);
    }
  };

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
  const [uploadedSeasonData, setUploadedSeasonData] = useState<any>(null);
  const [isLoadingSelectedSeasonToCopy, setIsLoadingSelectedSeasonToCopy] =
    useState<boolean>(false);

  const [selectSeasonToCopyPopupActive, setSelectSeasonToCopyPopupActive] =
    useState<boolean>(false);
  const [copyRecurringEvents, setCopyRecurringEvents] =
    useState<boolean>(false);
  const [copySchoolCalendar, setCopySchoolCalendar] =
    useState<boolean>(false);

  const onClickAddHandler = async () => {
    if (inputRef.current.year === "") {
      return alert("학년도를 입력해주세요");
    }
    if (inputRef.current.term === "") {
      return alert("학기를 입력해주세요");
    }

    try {
      // 파일에서 가져온 데이터가 있으면 copyFromData 사용, 아니면 copyFrom 사용
      const useUploadedData = uploadedSeasonData && !selectedSeasonToCopy?._id;

      const { season } = await SeasonAPI.CSeason({
        data: {
          school: props.school,
          year: inputRef.current.year,
          term: inputRef.current.term,
          period: inputRef.current.period,
          copyFromData: useUploadedData ? uploadedSeasonData : undefined,
          copyFrom: !useUploadedData ? selectedSeasonToCopy?._id : undefined,
          copyRecurringEvents:
            !useUploadedData && selectedSeasonToCopy?._id
              ? copyRecurringEvents
              : undefined,
          copySchoolCalendar:
            !useUploadedData && selectedSeasonToCopy?._id
              ? copySchoolCalendar
              : undefined,
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

      if (!selectedSeasonToCopy?._id) {
        props.setSeasonToEdit({ ...season, registrations: [] });
        props.setEditPopupActive(true);
      }
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
            {selectedSeasonToCopy?._id && (
              <div style={{ display: "flex", gap: "24px", marginTop: "12px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={copyRecurringEvents}
                    onChange={(e) => setCopyRecurringEvents(e.target.checked)}
                  />
                  반복 일정도 복사
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={copySchoolCalendar}
                    onChange={(e) => setCopySchoolCalendar(e.target.checked)}
                  />
                  학교 캘린더도 복사
                </label>
              </div>
            )}
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
                setUploadedSeasonData(null); // 업로드 데이터도 초기화
                setIsLoadingSelectedSeasonToCopy(true);
                setSelectSeasonToCopyPopupActive(false);
              }}
            >
              선택하지 않고 진행하기
            </Button>
          }
        >
          
        <button
        style={{
          cursor: "pointer",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",  
          borderRadius: "4px",
          border : "1px solid #CCCCCC",
          height: "34px",
          color: "var(--btn-text-color-3)",
          backgroundColor: "var(--btn-color-3)",
          marginBottom: "4px",
          width: "100%",
        }}
          onClick={() => {
            handleProfileUploadButtonClick();
          }}>
          파일 업로드
        </button>
        <input
          type="file"
          ref={fileInput}
          style={{ display: "none" }}
          onChange={(e: any) => {
            handleFileChange(e);
            e.target.value = "";
          }}
  />
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
                  setUploadedSeasonData(null); // 테이블에서 선택하면 업로드 데이터 초기화
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
