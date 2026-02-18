import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";

import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Autofill from "components/input/Autofill";

import {
  TReservationSlot,
  TReservation,
  TReservationConfig,
  TApplicationResponse,
} from "types/reservation";
import { TBoard } from "types/board";
import SlotCalendarView from "./SlotCalendarView";
import { ReservationStatusBadge, SlotStatusBadge } from "./ReservationStatusBadge";
import style from "./reservation.module.scss";

type Props = {
  postId: string;
  config: TReservationConfig;
  schoolId: string;
  board: TBoard;
};

const ReservationApplyPanel = ({ postId, config, schoolId, board }: Props) => {
  const { currentUser } = useAuth();
  const { ReservationSlotAPI, ReservationAPI, UserAPI } = useAPIv2();

  const [slots, setSlots] = useState<TReservationSlot[]>([]);
  const [myReservations, setMyReservations] = useState<TReservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"calendar" | "my">("calendar");

  // 신청 팝업
  const [applySlot, setApplySlot] = useState<TReservationSlot | null>(null);
  const [applyMemo, setApplyMemo] = useState("");
  const [applyApprover, setApplyApprover] = useState<{
    user: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [applyFormResponses, setApplyFormResponses] = useState<
    TApplicationResponse[]
  >([]);
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 내 예약 상세 보기
  const [detailReservation, setDetailReservation] =
    useState<TReservation | null>(null);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      ReservationSlotAPI.RReservationSlots({ query: { post: postId } }),
      ReservationAPI.RMyReservations({
        query: { school: schoolId, post: postId },
      }),
    ])
      .then(([slotsRes, myRes]) => {
        setSlots(slotsRes.reservationSlots);
        setMyReservations(myRes.reservations);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  };

  // 교사 목록 로드 (승인자 지정용)
  useEffect(() => {
    if (config.requireApproval) {
      UserAPI.RUsers({ query: { sid: schoolId } })
        .then(({ users }) => {
          // 교사/관리자만 필터
          setTeacherList(
            users.filter(
              (u: any) => u.auth === "manager" || u.auth === "admin"
            )
          );
        })
        .catch(() => {});
    }
  }, [schoolId, config.requireApproval]);

  useEffect(() => {
    loadData();
  }, [postId]);

  const openApplyPopup = (slot: TReservationSlot) => {
    setApplySlot(slot);
    setApplyMemo("");
    setApplyApprover(null);
    // 신청 양식 초기화
    if (config.applicationForm && config.applicationForm.length > 0) {
      setApplyFormResponses(
        config.applicationForm.map((f) => ({ label: f.label, value: "" }))
      );
    } else {
      setApplyFormResponses([]);
    }
  };

  const handleApply = async () => {
    if (!applySlot) return;

    // 양식 필수 항목 검증
    if (config.applicationForm && config.applicationForm.length > 0) {
      for (let i = 0; i < config.applicationForm.length; i++) {
        const field = config.applicationForm[i];
        if (field.required && !applyFormResponses[i]?.value?.trim()) {
          alert(`"${field.label}" 항목을 입력해주세요.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const data: any = {
        slot: applySlot._id,
        memo: applyMemo,
      };

      if (applyApprover) {
        data.approver = applyApprover.user;
        data.approverId = applyApprover.userId;
        data.approverName = applyApprover.userName;
      }

      if (applyFormResponses.length > 0) {
        data.applicationResponses = applyFormResponses.filter(
          (r) => r.value.trim()
        );
      }

      await ReservationAPI.CReservation({ data });
      alert(
        config.requireApproval
          ? "예약 신청이 완료되었습니다. 승인을 기다려주세요."
          : "예약이 완료되었습니다."
      );
      setApplySlot(null);
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!window.confirm("예약을 취소하시겠습니까?")) return;

    try {
      await ReservationAPI.DReservation({
        params: { _id: reservationId },
      });
      alert("예약이 취소되었습니다.");
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 이미 예약한 슬롯 ID 셋
  const reservedSlotIds = new Set(
    myReservations
      .filter((r) => r.status === "pending" || r.status === "approved")
      .map((r) => r.slot)
  );

  // 선택 날짜의 슬롯
  const selectedSlots = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : [];

  const formatSlotLabel = (slot: TReservationSlot) => {
    if (config.slotMode === "time") {
      return `${slot.startTime} ~ ${slot.endTime}`;
    }
    return slot.label || "";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className={style.emptyState}>예약 정보를 불러오는 중...</div>
    );
  }

  return (
    <div className={style.manageContainer}>
      {/* 탭 */}
      <div className={style.tabContainer}>
        <button
          className={`${style.tab} ${
            activeTab === "calendar" ? style.tabActive : ""
          }`}
          onClick={() => setActiveTab("calendar")}
        >
          예약하기
        </button>
        <button
          className={`${style.tab} ${
            activeTab === "my" ? style.tabActive : ""
          }`}
          onClick={() => setActiveTab("my")}
        >
          내 예약 (
          {myReservations.filter((r) => r.status !== "cancelled").length})
        </button>
      </div>

      {activeTab === "calendar" && (
        <>
          {/* 캘린더 */}
          <SlotCalendarView
            slots={slots}
            slotMode={config.slotMode}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* 선택 날짜의 예약 가능 슬롯 */}
          {selectedDate && selectedSlots.length > 0 && (
            <div className={style.slotList}>
              {selectedSlots
                .sort((a, b) =>
                  config.slotMode === "time"
                    ? (a.startTime || "").localeCompare(b.startTime || "")
                    : (a.label || "").localeCompare(b.label || "")
                )
                .map((slot) => {
                  const isReserved = reservedSlotIds.has(slot._id);
                  const isFull = slot.status === "full";
                  const isClosed = slot.status === "closed";
                  const canApply = !isReserved && !isFull && !isClosed;

                  return (
                    <div
                      key={slot._id}
                      className={`${style.slotCard} ${
                        isReserved ? style.slotCardSelected : ""
                      } ${!canApply && !isReserved ? style.slotCardDisabled : ""}`}
                    >
                      <div className={style.slotInfo}>
                        <span className={style.slotTime}>
                          {formatSlotLabel(slot)}
                        </span>
                        <span className={style.slotCapacity}>
                          {slot.currentCount}/{slot.capacity}명
                        </span>
                      </div>
                      <div className={style.slotActions}>
                        <SlotStatusBadge status={slot.status} />
                        {canApply && (
                          <Button
                            type="ghost"
                            onClick={() => openApplyPopup(slot)}
                            style={{ padding: "4px 12px", fontSize: "13px" }}
                          >
                            신청
                          </Button>
                        )}
                        {isReserved && (
                          <span
                            style={{
                              fontSize: "13px",
                              color: "var(--accent-1)",
                              fontWeight: 500,
                            }}
                          >
                            신청됨
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {activeTab === "my" && (
        <>
          {myReservations.filter((r) => r.status !== "cancelled").length ===
          0 ? (
            <div className={style.emptyState}>예약 내역이 없습니다.</div>
          ) : (
            <div className={style.slotList}>
              {myReservations
                .filter((r) => r.status !== "cancelled")
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .map((reservation) => (
                  <div
                    key={reservation._id}
                    className={style.slotCard}
                    style={{ cursor: "pointer" }}
                    onClick={() => setDetailReservation(reservation)}
                  >
                    <div className={style.slotInfo}>
                      <span className={style.slotTime}>
                        {formatDate(reservation.date)}
                        {" · "}
                        {config.slotMode === "time"
                          ? `${reservation.startTime} ~ ${reservation.endTime}`
                          : reservation.label}
                      </span>
                      <span className={style.slotCapacity}>
                        {reservation.approverName &&
                          `승인자: ${reservation.approverName} · `}
                        {reservation.rejectReason &&
                          `거절 사유: ${reservation.rejectReason}`}
                      </span>
                    </div>
                    <div className={style.slotActions}>
                      <ReservationStatusBadge status={reservation.status} />
                      {(reservation.status === "pending" ||
                        reservation.status === "approved") && (
                        <Button
                          type="hover"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleCancel(reservation._id);
                          }}
                          style={{ padding: "4px 12px", fontSize: "13px" }}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* 신청 팝업 */}
      {applySlot && (
        <Popup
          setState={() => setApplySlot(null)}
          title="예약 신청"
          closeBtn
          contentScroll
          style={{ maxWidth: "480px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <Button type="hover" onClick={() => setApplySlot(null)}>
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleApply}
                disabled={isSubmitting}
              >
                {isSubmitting ? "신청 중..." : "신청"}
              </Button>
            </div>
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* 슬롯 정보 */}
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: "var(--background-color-2)",
              }}
            >
              <div style={{ fontWeight: 500, fontSize: "14px" }}>
                {applySlot.date} · {formatSlotLabel(applySlot)}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-color-2)",
                  marginTop: "4px",
                }}
              >
                {applySlot.currentCount}/{applySlot.capacity}명 ·{" "}
                {config.resource}
              </div>
            </div>

            {/* 승인자 지정 */}
            {config.requireApproval && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  승인 교사 지정
                </label>
                {applyApprover ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "var(--background-color-2)",
                      fontSize: "14px",
                    }}
                  >
                    <span>
                      {applyApprover.userName}({applyApprover.userId})
                    </span>
                    <button
                      onClick={() => setApplyApprover(null)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-color-2)",
                        fontSize: "16px",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <Autofill
                    appearence="flat"
                    placeholder="승인할 교사를 검색하세요"
                    options={teacherList.map((u: any) => ({
                      text: `${u.userName}(${u.userId})`,
                      value: JSON.stringify({
                        user: u._id,
                        userId: u.userId,
                        userName: u.userName,
                      }),
                    }))}
                    setState={(val: string) => {
                      setApplyApprover(JSON.parse(val));
                    }}
                    resetOnClick
                  />
                )}
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-color-2)",
                    marginTop: "4px",
                  }}
                >
                  지정하지 않으면 보드 관리자 누구나 승인할 수 있습니다.
                </p>
              </div>
            )}

            {/* 신청 양식 */}
            {config.applicationForm &&
              config.applicationForm.length > 0 &&
              config.applicationForm.map((field, idx) => (
                <div key={idx}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 500,
                      marginBottom: "6px",
                    }}
                  >
                    {field.label}
                    {field.required && (
                      <span style={{ color: "var(--status-error)" }}> *</span>
                    )}
                  </label>
                  {field.type === "select" && field.options ? (
                    <select
                      className={style.configSelect}
                      style={{ width: "100%" }}
                      value={applyFormResponses[idx]?.value || ""}
                      onChange={(e) => {
                        const next = [...applyFormResponses];
                        next[idx] = { label: field.label, value: e.target.value };
                        setApplyFormResponses(next);
                      }}
                    >
                      <option value="">선택하세요</option>
                      {field.options.map((opt, oi) => (
                        <option key={oi} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className={style.configInput}
                      style={{ width: "100%", minHeight: "80px", resize: "vertical" }}
                      placeholder={`${field.label}을(를) 입력하세요`}
                      value={applyFormResponses[idx]?.value || ""}
                      onChange={(e) => {
                        const next = [...applyFormResponses];
                        next[idx] = { label: field.label, value: e.target.value };
                        setApplyFormResponses(next);
                      }}
                    />
                  ) : (
                    <input
                      className={style.configInput}
                      style={{ width: "100%" }}
                      placeholder={`${field.label}을(를) 입력하세요`}
                      value={applyFormResponses[idx]?.value || ""}
                      onChange={(e) => {
                        const next = [...applyFormResponses];
                        next[idx] = { label: field.label, value: e.target.value };
                        setApplyFormResponses(next);
                      }}
                    />
                  )}
                </div>
              ))}

            {/* 메모 */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  marginBottom: "6px",
                }}
              >
                메모 (선택)
              </label>
              <textarea
                className={style.configInput}
                style={{ width: "100%", minHeight: "60px", resize: "vertical" }}
                placeholder="추가 메모가 있으면 입력하세요"
                value={applyMemo}
                onChange={(e) => setApplyMemo(e.target.value)}
              />
            </div>
          </div>
        </Popup>
      )}

      {/* 내 예약 상세 팝업 */}
      {detailReservation && (
        <Popup
          setState={() => setDetailReservation(null)}
          title="예약 상세"
          closeBtn
          style={{ maxWidth: "440px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              {(detailReservation.status === "pending" ||
                detailReservation.status === "approved") && (
                <Button
                  type="hover"
                  onClick={() => {
                    handleCancel(detailReservation._id);
                    setDetailReservation(null);
                  }}
                >
                  예약 취소
                </Button>
              )}
              <Button
                type="ghost"
                onClick={() => setDetailReservation(null)}
              >
                닫기
              </Button>
            </div>
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div className={style.configSection}>
              <div className={style.configRow}>
                <label>날짜</label>
                <span>{formatDate(detailReservation.date)}</span>
              </div>
              <div className={style.configRow}>
                <label>
                  {config.slotMode === "time" ? "시간" : "슬롯"}
                </label>
                <span>
                  {config.slotMode === "time"
                    ? `${detailReservation.startTime} ~ ${detailReservation.endTime}`
                    : detailReservation.label}
                </span>
              </div>
              <div className={style.configRow}>
                <label>상태</label>
                <ReservationStatusBadge status={detailReservation.status} />
              </div>
              {detailReservation.approverName && (
                <div className={style.configRow}>
                  <label>승인 교사</label>
                  <span>{detailReservation.approverName}</span>
                </div>
              )}
              {detailReservation.rejectReason && (
                <div className={style.configRow}>
                  <label>거절 사유</label>
                  <span>{detailReservation.rejectReason}</span>
                </div>
              )}
              {detailReservation.memo && (
                <div className={style.configRow}>
                  <label>메모</label>
                  <span>{detailReservation.memo}</span>
                </div>
              )}
              {detailReservation.applicationResponses &&
                detailReservation.applicationResponses.length > 0 &&
                detailReservation.applicationResponses.map((r, idx) => (
                  <div key={idx} className={style.configRow}>
                    <label>{r.label}</label>
                    <span>{r.value}</span>
                  </div>
                ))}
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default ReservationApplyPanel;
