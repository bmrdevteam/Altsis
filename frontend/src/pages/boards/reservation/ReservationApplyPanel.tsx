import { useEffect, useState, useMemo } from "react";
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

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const ReservationApplyPanel = ({ postId, config, schoolId, board }: Props) => {
  const { currentUser } = useAuth();
  const { ReservationSlotAPI, ReservationAPI, UserAPI } = useAPIv2();

  const [slots, setSlots] = useState<TReservationSlot[]>([]);
  const [myReservations, setMyReservations] = useState<TReservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"calendar" | "my" | "bulk">(
    "calendar"
  );

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

  // 일괄 신청 상태
  const [bulkDays, setBulkDays] = useState<number[]>([]);
  const [bulkLabel, setBulkLabel] = useState("");
  const [bulkTimeSlot, setBulkTimeSlot] = useState("");
  const [bulkItem, setBulkItem] = useState("");
  const [bulkMemo, setBulkMemo] = useState("");

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

  // 슬롯 예약 가능 여부 (사전 예약 제한)
  const isSlotBookable = (slot: TReservationSlot): boolean => {
    if (!config.advanceBooking) return true;

    const { openBefore, closeBefore } = config.advanceBooking;
    const slotTime = slot.startTime
      ? new Date(`${slot.date}T${slot.startTime}:00`)
      : new Date(`${slot.date}T00:00:00`);
    const now = new Date();

    if (openBefore && openBefore.value > 0) {
      const openTime = new Date(slotTime);
      if (openBefore.unit === "days")
        openTime.setDate(openTime.getDate() - openBefore.value);
      else openTime.setHours(openTime.getHours() - openBefore.value);
      if (now < openTime) return false;
    }

    if (closeBefore && closeBefore.value > 0) {
      const closeTime = new Date(slotTime);
      if (closeBefore.unit === "days")
        closeTime.setDate(closeTime.getDate() - closeBefore.value);
      else closeTime.setHours(closeTime.getHours() - closeBefore.value);
      if (now > closeTime) return false;
    }

    return true;
  };

  const getSlotBookableStatus = (
    slot: TReservationSlot
  ): null | "not-open" | "closed" => {
    if (!config.advanceBooking) return null;

    const { openBefore, closeBefore } = config.advanceBooking;
    const slotTime = slot.startTime
      ? new Date(`${slot.date}T${slot.startTime}:00`)
      : new Date(`${slot.date}T00:00:00`);
    const now = new Date();

    if (openBefore && openBefore.value > 0) {
      const openTime = new Date(slotTime);
      if (openBefore.unit === "days")
        openTime.setDate(openTime.getDate() - openBefore.value);
      else openTime.setHours(openTime.getHours() - openBefore.value);
      if (now < openTime) return "not-open";
    }

    if (closeBefore && closeBefore.value > 0) {
      const closeTime = new Date(slotTime);
      if (closeBefore.unit === "days")
        closeTime.setDate(closeTime.getDate() - closeBefore.value);
      else closeTime.setHours(closeTime.getHours() - closeBefore.value);
      if (now > closeTime) return "closed";
    }

    return null;
  };

  const openApplyPopup = (slot: TReservationSlot) => {
    setApplySlot(slot);
    setApplyMemo("");
    setApplyApprover(null);
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

  const formatSlotLabel = (slot: { startTime?: string; endTime?: string; label?: string; item?: string }) => {
    let text = "";
    if (config.slotMode === "time") {
      text = `${slot.startTime} ~ ${slot.endTime}`;
    } else {
      text = slot.label || "";
    }
    if (slot.item) {
      text += ` · ${slot.item}`;
    }
    return text;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 일괄 신청 - 고유 값 목록
  const uniqueLabels = useMemo(
    () => Array.from(new Set(slots.map((s) => s.label).filter(Boolean))) as string[],
    [slots]
  );
  const uniqueTimeSlots = useMemo(() => {
    const set = new Set(
      slots
        .filter((s) => s.startTime && s.endTime)
        .map((s) => `${s.startTime}~${s.endTime}`)
    );
    return Array.from(set);
  }, [slots]);
  const uniqueItems = useMemo(
    () => Array.from(new Set(slots.map((s) => s.item).filter(Boolean))) as string[],
    [slots]
  );

  // 일괄 신청 매칭 슬롯
  const bulkMatchingSlots = useMemo(() => {
    const now = new Date();
    return slots.filter((s) => {
      if (new Date(s.date) < now) return false;
      if (s.status !== "open") return false;
      if (reservedSlotIds.has(s._id)) return false;
      if (bulkDays.length > 0 && !bulkDays.includes(s.dayOfWeek)) return false;
      if (config.slotMode === "time" && bulkTimeSlot) {
        if (`${s.startTime}~${s.endTime}` !== bulkTimeSlot) return false;
      }
      if (config.slotMode === "label" && bulkLabel) {
        if (s.label !== bulkLabel) return false;
      }
      if (bulkItem && s.item !== bulkItem) return false;
      if (!isSlotBookable(s)) return false;
      return true;
    });
  }, [slots, bulkDays, bulkLabel, bulkTimeSlot, bulkItem, reservedSlotIds]);

  const handleBulkApply = async () => {
    const slotIds = bulkMatchingSlots.map((s) => s._id);
    if (slotIds.length === 0) {
      alert("조건에 맞는 예약 가능한 슬롯이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        `${slotIds.length}건을 일괄 신청하시겠습니까?`
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const { reservations, errors } = await ReservationAPI.CReservationsBulk({
        data: { slots: slotIds, memo: bulkMemo },
      });
      alert(
        `${reservations.length}건 신청 완료${
          errors.length > 0 ? `, ${errors.length}건 실패` : ""
        }`
      );
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 예약 비활성화 상태
  if (config.isReservationActive === false) {
    return (
      <div className={style.emptyState}>예약이 비활성화되었습니다.</div>
    );
  }

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
        {config.allowBulkApply && (
          <button
            className={`${style.tab} ${
              activeTab === "bulk" ? style.tabActive : ""
            }`}
            onClick={() => setActiveTab("bulk")}
          >
            일괄 신청
          </button>
        )}
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
                    ? (a.startTime || "").localeCompare(b.startTime || "") ||
                      (a.item || "").localeCompare(b.item || "")
                    : (a.label || "").localeCompare(b.label || "") ||
                      (a.item || "").localeCompare(b.item || "")
                )
                .map((slot) => {
                  const isReserved = reservedSlotIds.has(slot._id);
                  const isFull = slot.status === "full";
                  const isClosed = slot.status === "closed";
                  const bookable = isSlotBookable(slot);
                  const bookableStatus = getSlotBookableStatus(slot);
                  const canApply =
                    !isReserved && !isFull && !isClosed && bookable;

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
                        {bookableStatus === "not-open" ? (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-color-2)",
                            }}
                          >
                            예약 오픈 전
                          </span>
                        ) : bookableStatus === "closed" ? (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-color-2)",
                            }}
                          >
                            예약 마감
                          </span>
                        ) : (
                          <SlotStatusBadge status={slot.status} />
                        )}
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
                        {formatSlotLabel(reservation)}
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

      {/* 일괄 신청 탭 */}
      {activeTab === "bulk" && config.allowBulkApply && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 요일 선택 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              요일
            </label>
            <div className={style.dayCheckboxGroup}>
              {DAY_LABELS.map((label, idx) => (
                <label
                  key={idx}
                  className={`${style.dayCheckbox} ${
                    bulkDays.includes(idx) ? style.dayCheckboxChecked : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={bulkDays.includes(idx)}
                    onChange={(e) => {
                      setBulkDays((prev) =>
                        e.target.checked
                          ? [...prev, idx].sort()
                          : prev.filter((d) => d !== idx)
                      );
                    }}
                    style={{ display: "none" }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* 시간/라벨 선택 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              {config.slotMode === "time" ? "시간대" : "라벨"}
            </label>
            <select
              className={style.configSelect}
              style={{ width: "100%" }}
              value={
                config.slotMode === "time" ? bulkTimeSlot : bulkLabel
              }
              onChange={(e) => {
                if (config.slotMode === "time") {
                  setBulkTimeSlot(e.target.value);
                } else {
                  setBulkLabel(e.target.value);
                }
              }}
            >
              <option value="">전체</option>
              {config.slotMode === "time"
                ? uniqueTimeSlots.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts.replace("~", " ~ ")}
                    </option>
                  ))
                : uniqueLabels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
            </select>
          </div>

          {/* 아이템 선택 */}
          {uniqueItems.length > 0 && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                아이템
              </label>
              <select
                className={style.configSelect}
                style={{ width: "100%" }}
                value={bulkItem}
                onChange={(e) => setBulkItem(e.target.value)}
              >
                <option value="">전체</option>
                {uniqueItems.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 메모 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              메모 (선택)
            </label>
            <textarea
              className={style.configInput}
              style={{
                width: "100%",
                minHeight: "60px",
                resize: "vertical",
              }}
              placeholder="일괄 신청 메모"
              value={bulkMemo}
              onChange={(e) => setBulkMemo(e.target.value)}
            />
          </div>

          {/* 매칭 결과 미리보기 */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "var(--background-color-2)",
            }}
          >
            <div style={{ fontWeight: 500, fontSize: "14px" }}>
              매칭 슬롯: {bulkMatchingSlots.length}건
            </div>
            {bulkMatchingSlots.length > 0 && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  marginTop: "4px",
                  maxHeight: "120px",
                  overflow: "auto",
                }}
              >
                {bulkMatchingSlots.slice(0, 20).map((s) => (
                  <div key={s._id}>
                    {s.date} · {formatSlotLabel(s)}
                  </div>
                ))}
                {bulkMatchingSlots.length > 20 && (
                  <div>... 외 {bulkMatchingSlots.length - 20}건</div>
                )}
              </div>
            )}
          </div>

          <Button
            type="ghost"
            onClick={handleBulkApply}
            disabled={isSubmitting || bulkMatchingSlots.length === 0}
            style={{ alignSelf: "flex-end" }}
          >
            {isSubmitting
              ? "신청 중..."
              : `${bulkMatchingSlots.length}건 일괄 신청`}
          </Button>
        </div>
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
                        next[idx] = {
                          label: field.label,
                          value: e.target.value,
                        };
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
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        resize: "vertical",
                      }}
                      placeholder={`${field.label}을(를) 입력하세요`}
                      value={applyFormResponses[idx]?.value || ""}
                      onChange={(e) => {
                        const next = [...applyFormResponses];
                        next[idx] = {
                          label: field.label,
                          value: e.target.value,
                        };
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
                        next[idx] = {
                          label: field.label,
                          value: e.target.value,
                        };
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
              {detailReservation.item && (
                <div className={style.configRow}>
                  <label>아이템</label>
                  <span>{detailReservation.item}</span>
                </div>
              )}
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
