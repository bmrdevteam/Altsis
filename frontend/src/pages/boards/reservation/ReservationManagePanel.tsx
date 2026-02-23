import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

import {
  TReservationSlot,
  TReservation,
  TReservationConfig,
  TReservationStatus,
} from "types/reservation";
import { TBoard } from "types/board";
import SlotCalendarView from "./SlotCalendarView";
import SlotBulkCreateForm from "./SlotBulkCreateForm";
import {
  ReservationStatusBadge,
  SlotStatusBadge,
} from "./ReservationStatusBadge";
import style from "./reservation.module.scss";

type Props = {
  postId: string;
  config: TReservationConfig;
  board: TBoard;
  onConfigUpdate?: (config: TReservationConfig) => void;
};

const ReservationManagePanel = ({ postId, config, board, onConfigUpdate }: Props) => {
  const { ReservationSlotAPI, ReservationAPI, PostAPI } = useAPIv2();

  const [slots, setSlots] = useState<TReservationSlot[]>([]);
  const [reservations, setReservations] = useState<TReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"slots" | "reservations">(
    "slots"
  );
  const [statusFilter, setStatusFilter] = useState<
    TReservationStatus | "all"
  >("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [showRejectPopup, setShowRejectPopup] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // 날짜 상세 팝업
  const [detailDate, setDetailDate] = useState<string | null>(null);
  // 예약 상세 팝업
  const [detailReservation, setDetailReservation] =
    useState<TReservation | null>(null);
  // 예약 활성화 상태
  const [isReservationActive, setIsReservationActive] = useState(
    config.isReservationActive !== false
  );

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      ReservationSlotAPI.RReservationSlots({ query: { post: postId } }),
      ReservationAPI.RReservations({ query: { post: postId } }),
    ])
      .then(([slotsRes, reservationsRes]) => {
        setSlots(slotsRes.reservationSlots);
        setReservations(reservationsRes.reservations);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [postId]);

  // 예약 활성화/비활성화 토글
  const handleToggleActive = async (active: boolean) => {
    try {
      await PostAPI.UPost({
        params: { _id: postId },
        data: {
          reservationConfig: { ...config, isReservationActive: active },
        },
      });
      setIsReservationActive(active);
      if (onConfigUpdate) {
        onConfigUpdate({ ...config, isReservationActive: active });
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 슬롯 삭제
  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm("이 슬롯을 삭제하시겠습니까?")) return;

    try {
      await ReservationSlotAPI.DReservationSlot({
        params: { _id: slotId },
      });
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 슬롯 일괄 삭제
  const handleBulkDeleteSlots = async () => {
    const slotIds = Array.from(selectedIds);
    if (slotIds.length === 0) return;
    if (!window.confirm(`${slotIds.length}개 슬롯을 삭제하시겠습니까?`)) return;

    try {
      await ReservationSlotAPI.DReservationSlotsBulk({
        data: { ids: slotIds },
      });
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 예약 승인
  const handleApprove = async (reservationId: string) => {
    try {
      await ReservationAPI.UReservationApprove({
        params: { _id: reservationId },
      });
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 예약 거절
  const handleReject = async () => {
    if (!showRejectPopup) return;
    try {
      await ReservationAPI.UReservationReject({
        params: { _id: showRejectPopup },
        data: { reason: rejectReason },
      });
      setShowRejectPopup(null);
      setRejectReason("");
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 일괄 승인
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`${ids.length}건을 일괄 승인하시겠습니까?`)) return;

    try {
      await ReservationAPI.UReservationsBulkApprove({
        data: { ids },
      });
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 일괄 거절
  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`${ids.length}건을 일괄 거절하시겠습니까?`)) return;

    try {
      await ReservationAPI.UReservationsBulkReject({
        data: { ids },
      });
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  };

  // 필터 적용된 예약 목록
  const filteredReservations =
    statusFilter === "all"
      ? reservations
      : reservations.filter((r) => r.status === statusFilter);

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
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

  // 통계
  const stats = {
    totalSlots: slots.length,
    openSlots: slots.filter((s) => s.status === "open").length,
    totalReservations: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    approved: reservations.filter((r) => r.status === "approved").length,
  };

  // 날짜별 예약 그룹
  const getReservationsForDate = (date: string) =>
    reservations.filter((r) => r.date === date && r.status !== "cancelled");

  // 날짜별 슬롯
  const getSlotsForDate = (date: string) =>
    slots.filter((s) => s.date === date);

  if (isLoading) {
    return <div className={style.emptyState}>로딩 중...</div>;
  }

  return (
    <div className={style.manageContainer}>
      {/* 예약 활성화 토글 + 통계 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div className={style.statsRow} style={{ marginBottom: 0 }}>
          <div className={style.statCard}>
            <span className={style.statValue}>{stats.totalSlots}</span>
            <span className={style.statLabel}>전체 슬롯</span>
          </div>
          <div className={style.statCard}>
            <span className={style.statValue}>{stats.openSlots}</span>
            <span className={style.statLabel}>예약 가능</span>
          </div>
          <div className={style.statCard}>
            <span className={style.statValue}>{stats.pending}</span>
            <span className={style.statLabel}>대기</span>
          </div>
          <div className={style.statCard}>
            <span className={style.statValue}>{stats.approved}</span>
            <span className={style.statLabel}>승인</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: isReservationActive
                ? "var(--status-success)"
                : "var(--text-color-2)",
              fontWeight: 500,
            }}
          >
            {isReservationActive ? "예약 활성화" : "예약 비활성화"}
          </span>
          <ToggleSwitch
            defaultChecked={isReservationActive}
            onChange={handleToggleActive}
          />
        </div>
      </div>

      {/* 탭 */}
      <div className={style.tabContainer}>
        <button
          className={`${style.tab} ${
            activeTab === "slots" ? style.tabActive : ""
          }`}
          onClick={() => {
            setActiveTab("slots");
            setSelectedIds(new Set());
          }}
        >
          슬롯 관리
        </button>
        <button
          className={`${style.tab} ${
            activeTab === "reservations" ? style.tabActive : ""
          }`}
          onClick={() => {
            setActiveTab("reservations");
            setSelectedIds(new Set());
          }}
        >
          예약 관리{" "}
          {stats.pending > 0 && (
            <span
              style={{
                background: "var(--status-warning)",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "11px",
                marginLeft: "4px",
              }}
            >
              {stats.pending}
            </span>
          )}
        </button>
      </div>

      {/* 슬롯 관리 탭 */}
      {activeTab === "slots" && (
        <>
          <div className={style.manageToolbar}>
            <div className={style.manageFilters}>
              {selectedIds.size > 0 && (
                <span
                  style={{ fontSize: "13px", color: "var(--text-color-2)" }}
                >
                  {selectedIds.size}개 선택
                </span>
              )}
            </div>
            <div className={style.bulkActions}>
              {selectedIds.size > 0 && (
                <Button
                  type="hover"
                  onClick={handleBulkDeleteSlots}
                  style={{ fontSize: "13px" }}
                >
                  선택 삭제
                </Button>
              )}
              <Button
                type="ghost"
                onClick={() => setShowBulkCreate(true)}
                style={{ fontSize: "13px" }}
              >
                슬롯 일괄 생성
              </Button>
            </div>
          </div>

          <SlotCalendarView
            slots={slots}
            slotMode={config.slotMode}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setDetailDate(date);
            }}
          />

          {/* 선택 날짜 슬롯 관리 목록 */}
          {selectedDate && (
            <div>
              {getSlotsForDate(selectedDate)
                .sort((a, b) => {
                  const primary =
                    config.slotMode === "time"
                      ? (a.startTime || "").localeCompare(b.startTime || "")
                      : (a.label || "").localeCompare(b.label || "");
                  if (primary !== 0) return primary;
                  return (a.item || "").localeCompare(b.item || "");
                })
                .map((slot) => (
                  <div
                    key={slot._id}
                    className={`${style.slotCard} ${
                      selectedIds.has(slot._id) ? style.slotCardSelected : ""
                    }`}
                    style={{ marginBottom: "8px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(slot._id)}
                        onChange={() => toggleSelect(slot._id)}
                        style={{ accentColor: "var(--accent-1)" }}
                      />
                      <div className={style.slotInfo}>
                        <span className={style.slotTime}>
                          {formatSlotLabel(slot)}
                        </span>
                        <span className={style.slotCapacity}>
                          {slot.currentCount}/{slot.capacity}명
                          {slot.memo && ` · ${slot.memo}`}
                        </span>
                      </div>
                    </div>
                    <div className={style.slotActions}>
                      <SlotStatusBadge status={slot.status} />
                      <Button
                        type="hover"
                        onClick={() => handleDeleteSlot(slot._id)}
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* 예약 관리 탭 */}
      {activeTab === "reservations" && (
        <>
          <div className={style.manageToolbar}>
            <div className={style.manageFilters}>
              <select
                className={style.filterSelect}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as TReservationStatus | "all"
                  )
                }
              >
                <option value="all">전체</option>
                <option value="pending">대기</option>
                <option value="approved">승인</option>
                <option value="rejected">거절</option>
                <option value="cancelled">취소</option>
              </select>
              {selectedIds.size > 0 && (
                <span
                  style={{ fontSize: "13px", color: "var(--text-color-2)" }}
                >
                  {selectedIds.size}개 선택
                </span>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className={style.bulkActions}>
                <Button
                  type="ghost"
                  onClick={handleBulkApprove}
                  style={{ fontSize: "13px" }}
                >
                  일괄 승인
                </Button>
                <Button
                  type="hover"
                  onClick={handleBulkReject}
                  style={{ fontSize: "13px" }}
                >
                  일괄 거절
                </Button>
              </div>
            )}
          </div>

          {filteredReservations.length === 0 ? (
            <div className={style.emptyState}>예약 내역이 없습니다.</div>
          ) : (
            <table className={style.reservationTable}>
              <thead>
                <tr>
                  <th style={{ width: "36px" }}>
                    <input
                      type="checkbox"
                      onChange={() =>
                        toggleSelectAll(
                          filteredReservations.map((r) => r._id)
                        )
                      }
                      checked={
                        filteredReservations.length > 0 &&
                        filteredReservations.every((r) =>
                          selectedIds.has(r._id)
                        )
                      }
                    />
                  </th>
                  <th>신청자</th>
                  <th>날짜</th>
                  <th>{config.slotMode === "time" ? "시간" : "슬롯"}</th>
                  {config.items && config.items.length > 0 && <th>아이템</th>}
                  {config.requireApproval && <th>지정 승인자</th>}
                  <th>상태</th>
                  <th style={{ width: "120px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((reservation) => (
                    <tr
                      key={reservation._id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setDetailReservation(reservation)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(reservation._id)}
                          onChange={() => toggleSelect(reservation._id)}
                        />
                      </td>
                      <td>
                        {reservation.userName} ({reservation.userId})
                      </td>
                      <td>{formatDate(reservation.date)}</td>
                      <td>
                        {config.slotMode === "time"
                          ? `${reservation.startTime} ~ ${reservation.endTime}`
                          : reservation.label}
                      </td>
                      {config.items && config.items.length > 0 && (
                        <td>{reservation.item || "-"}</td>
                      )}
                      {config.requireApproval && (
                        <td>
                          {reservation.approverName || (
                            <span style={{ color: "var(--text-color-2)" }}>
                              미지정
                            </span>
                          )}
                        </td>
                      )}
                      <td>
                        <ReservationStatusBadge
                          status={reservation.status}
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {reservation.status === "pending" && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <Button
                              type="ghost"
                              onClick={() =>
                                handleApprove(reservation._id)
                              }
                              style={{
                                padding: "2px 8px",
                                fontSize: "12px",
                              }}
                            >
                              승인
                            </Button>
                            <Button
                              type="hover"
                              onClick={() =>
                                setShowRejectPopup(reservation._id)
                              }
                              style={{
                                padding: "2px 8px",
                                fontSize: "12px",
                              }}
                            >
                              거절
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* 슬롯 일괄 생성 팝업 */}
      {showBulkCreate && (
        <SlotBulkCreateForm
          setState={setShowBulkCreate}
          postId={postId}
          slotMode={config.slotMode}
          defaultCapacity={config.defaultCapacity}
          onCreated={loadData}
          template={config.slotRuleTemplate}
          configItems={config.items}
        />
      )}

      {/* 거절 사유 팝업 */}
      {showRejectPopup && (
        <Popup
          setState={() => setShowRejectPopup(null)}
          title="예약 거절"
          closeBtn
          style={{ maxWidth: "400px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <Button type="hover" onClick={() => setShowRejectPopup(null)}>
                취소
              </Button>
              <Button type="ghost" onClick={handleReject}>
                거절
              </Button>
            </div>
          }
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              거절 사유 (선택)
            </label>
            <textarea
              className={style.configInput}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요"
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>
        </Popup>
      )}

      {/* 날짜 상세 팝업 */}
      {detailDate && (
        <Popup
          setState={() => setDetailDate(null)}
          title={`${detailDate} (${DAY_LABELS[new Date(detailDate).getDay()]}) 신청 현황`}
          closeBtn
          contentScroll
          style={{ maxWidth: "640px", width: "100%" }}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="ghost" onClick={() => setDetailDate(null)}>
                닫기
              </Button>
            </div>
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* 해당 날짜 슬롯별 현황 */}
            {getSlotsForDate(detailDate).length === 0 ? (
              <div className={style.emptyState}>
                이 날짜에 등록된 슬롯이 없습니다.
              </div>
            ) : (
              getSlotsForDate(detailDate)
                .sort((a, b) => {
                  const primary =
                    config.slotMode === "time"
                      ? (a.startTime || "").localeCompare(b.startTime || "")
                      : (a.label || "").localeCompare(b.label || "");
                  if (primary !== 0) return primary;
                  return (a.item || "").localeCompare(b.item || "");
                })
                .map((slot) => {
                  const slotReservations = reservations.filter(
                    (r) =>
                      r.slot === slot._id && r.status !== "cancelled"
                  );

                  return (
                    <div
                      key={slot._id}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {/* 슬롯 헤더 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          background: "var(--background-color-2)",
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{ fontWeight: 600, fontSize: "14px" }}
                          >
                            {formatSlotLabel(slot)}
                          </span>
                          <SlotStatusBadge status={slot.status} />
                        </div>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--text-color-2)",
                          }}
                        >
                          {slot.currentCount}/{slot.capacity}명
                        </span>
                      </div>

                      {/* 예약자 목록 */}
                      {slotReservations.length === 0 ? (
                        <div
                          style={{
                            padding: "12px 16px",
                            fontSize: "13px",
                            color: "var(--text-color-2)",
                          }}
                        >
                          신청 내역 없음
                        </div>
                      ) : (
                        slotReservations.map((r) => (
                          <div
                            key={r._id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 16px",
                              borderBottom:
                                "1px solid var(--border-color)",
                              fontSize: "14px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setDetailDate(null);
                              setDetailReservation(r);
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span>
                                {r.userName} ({r.userId})
                              </span>
                              {r.approverName && (
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--text-color-2)",
                                  }}
                                >
                                  → {r.approverName}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <ReservationStatusBadge
                                status={r.status}
                              />
                              {r.status === "pending" && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "4px",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    type="ghost"
                                    onClick={() =>
                                      handleApprove(r._id)
                                    }
                                    style={{
                                      padding: "2px 6px",
                                      fontSize: "11px",
                                    }}
                                  >
                                    승인
                                  </Button>
                                  <Button
                                    type="hover"
                                    onClick={() =>
                                      setShowRejectPopup(r._id)
                                    }
                                    style={{
                                      padding: "2px 6px",
                                      fontSize: "11px",
                                    }}
                                  >
                                    거절
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </Popup>
      )}

      {/* 예약 상세 팝업 */}
      {detailReservation && (
        <Popup
          setState={() => setDetailReservation(null)}
          title="예약 상세"
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
              {detailReservation.status === "pending" && (
                <>
                  <Button
                    type="ghost"
                    onClick={() => {
                      handleApprove(detailReservation._id);
                      setDetailReservation(null);
                    }}
                  >
                    승인
                  </Button>
                  <Button
                    type="hover"
                    onClick={() => {
                      setDetailReservation(null);
                      setShowRejectPopup(detailReservation._id);
                    }}
                  >
                    거절
                  </Button>
                </>
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
                <label>신청자</label>
                <span>
                  {detailReservation.userName} ({detailReservation.userId})
                </span>
              </div>
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
                  <label>지정 승인자</label>
                  <span>{detailReservation.approverName}</span>
                </div>
              )}
              {detailReservation.processedByName && (
                <div className={style.configRow}>
                  <label>처리자</label>
                  <span>{detailReservation.processedByName}</span>
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
                detailReservation.applicationResponses.length > 0 && (
                  <>
                    <div
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: "10px",
                        marginTop: "4px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--text-color-2)",
                          textTransform: "uppercase",
                        }}
                      >
                        신청 양식 응답
                      </label>
                    </div>
                    {detailReservation.applicationResponses.map((r, idx) => (
                      <div key={idx} className={style.configRow}>
                        <label>{r.label}</label>
                        <span>{r.value}</span>
                      </div>
                    ))}
                  </>
                )}
              <div className={style.configRow}>
                <label>신청일</label>
                <span style={{ fontSize: "13px", color: "var(--text-color-2)" }}>
                  {new Date(detailReservation.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default ReservationManagePanel;
