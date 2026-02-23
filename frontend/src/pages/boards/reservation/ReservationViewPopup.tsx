import { useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import { TPost } from "types/post";
import { TBoard } from "types/board";
import ReservationApplyPanel from "./ReservationApplyPanel";
import ReservationManagePanel from "./ReservationManagePanel";
import style from "./reservation.module.scss";

type Props = {
  setState: (state: boolean) => void;
  post: TPost;
  board: TBoard;
  canManage: boolean;
};

const ReservationViewPopup = ({ setState, post, board, canManage }: Props) => {
  const [config, setConfig] = useState(post.reservationConfig!);
  const [activeView, setActiveView] = useState<"apply" | "manage">(
    canManage ? "manage" : "apply"
  );

  return (
    <Popup
      setState={setState}
      title={`예약 · ${config.resource}`}
      closeBtn
      contentScroll
      style={{ maxWidth: "860px", width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="ghost" onClick={() => setState(false)}>
            닫기
          </Button>
        </div>
      }
    >
      <>
        {/* 설명 */}
        {config.resourceDescription ? (
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-color-2)",
              marginBottom: "16px",
              lineHeight: 1.6,
            }}
          >
            {config.resourceDescription}
          </p>
        ) : null}

        {/* 탭 헤더 (관리자만 탭 전환 가능) */}
        {canManage ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div className={style.tabContainer}>
              <button
                className={`${style.tab} ${
                  activeView === "manage" ? style.tabActive : ""
                }`}
                onClick={() => setActiveView("manage")}
              >
                관리
              </button>
              <button
                className={`${style.tab} ${
                  activeView === "apply" ? style.tabActive : ""
                }`}
                onClick={() => setActiveView("apply")}
              >
                예약하기
              </button>
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-color-2)" }}>
              {config.requireApproval ? "승인 필요" : "자동 승인"}
              {config.maxReservationsPerUser > 0 &&
                ` · 최대 ${config.maxReservationsPerUser}건`}
            </span>
          </div>
        ) : null}

        {/* 패널 */}
        {activeView === "manage" && canManage ? (
          <ReservationManagePanel
            postId={post._id}
            config={config}
            board={board}
            onConfigUpdate={setConfig}
          />
        ) : (
          <ReservationApplyPanel
            postId={post._id}
            config={config}
            schoolId={board.school}
            board={board}
          />
        )}
      </>
    </Popup>
  );
};

export default ReservationViewPopup;
