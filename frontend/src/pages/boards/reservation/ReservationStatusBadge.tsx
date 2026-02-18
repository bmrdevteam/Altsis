import { TReservationStatus, TReservationSlotStatus } from "types/reservation";
import style from "./reservation.module.scss";

const reservationStatusMap: Record<
  TReservationStatus,
  { label: string; className: string }
> = {
  pending: { label: "대기", className: style.statusPending },
  approved: { label: "승인", className: style.statusApproved },
  rejected: { label: "거절", className: style.statusRejected },
  cancelled: { label: "취소", className: style.statusCancelled },
};

const slotStatusMap: Record<
  TReservationSlotStatus,
  { label: string; className: string }
> = {
  open: { label: "예약 가능", className: style.slotOpen },
  full: { label: "마감", className: style.slotFull },
  closed: { label: "종료", className: style.slotClosed },
};

export const ReservationStatusBadge = ({
  status,
}: {
  status: TReservationStatus;
}) => {
  const info = reservationStatusMap[status];
  return (
    <span className={`${style.statusBadge} ${info.className}`}>
      {info.label}
    </span>
  );
};

export const SlotStatusBadge = ({
  status,
}: {
  status: TReservationSlotStatus;
}) => {
  const info = slotStatusMap[status];
  return (
    <span className={`${style.statusBadge} ${info.className}`}>
      {info.label}
    </span>
  );
};
