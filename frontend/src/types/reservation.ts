// 슬롯 모드
export type TSlotMode = "time" | "label";

// 신청 양식 필드 타입
export type TApplicationFieldType = "text" | "textarea" | "select";

// 신청 양식 필드
export type TApplicationFormField = {
  label: string;
  type: TApplicationFieldType;
  options?: string[];
  required: boolean;
};

// 신청 양식 응답
export type TApplicationResponse = {
  label: string;
  value: string;
};

// 슬롯 규칙 템플릿 (날짜 범위 제외 - JSON 가져오기/내보내기용)
export type TSlotRuleTemplate = {
  days: number[];
  timeSlots?: { startTime: string; endTime: string }[];
  labels?: string[];
  items?: string[];
  capacity: number;
};

// 사전 예약 제한 단위
export type TAdvanceBookingUnit = "hours" | "days";

// 사전 예약 제한
export type TAdvanceBooking = {
  openBefore: { value: number; unit: TAdvanceBookingUnit };
  closeBefore: { value: number; unit: TAdvanceBookingUnit };
};

// 예약 게시글 설정
export type TReservationConfig = {
  resource: string;
  resourceDescription: string;
  slotMode: TSlotMode;
  defaultCapacity: number;
  requireApproval: boolean;
  maxReservationsPerUser: number;
  reservationOpenAt?: string | null;
  reservationCloseAt?: string | null;
  totalSlots?: number;
  isReservationActive?: boolean;
  allowBulkApply?: boolean;
  items?: string[];
  advanceBooking?: TAdvanceBooking | null;
  applicationForm?: TApplicationFormField[];
  slotRuleTemplate?: TSlotRuleTemplate;
};

// 예약 설정 내보내기 데이터
export type TReservationExportData = {
  version: string;
  exportedAt: string;
  type: "reservation";
  config: {
    resource: string;
    resourceDescription: string;
    slotMode: TSlotMode;
    defaultCapacity: number;
    requireApproval: boolean;
    maxReservationsPerUser: number;
    items?: string[];
    applicationForm?: TApplicationFormField[];
  };
  slotRuleTemplate?: TSlotRuleTemplate;
};

// 게시글 유형
export type TPostType = "general" | "reservation" | "survey";

// 예약 슬롯 상태
export type TReservationSlotStatus = "open" | "closed" | "full";

// 예약 슬롯
export type TReservationSlot = {
  _id: string;
  post: string;
  board: string;
  school: string;
  date: string;
  startTime?: string;
  endTime?: string;
  label?: string;
  item?: string;
  dayOfWeek: number;
  capacity: number;
  currentCount: number;
  status: TReservationSlotStatus;
  memo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// 예약 상태
export type TReservationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

// 예약
export type TReservation = {
  _id: string;
  slot: string;
  post: string;
  board: string;
  school: string;
  user: string;
  userId: string;
  userName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  label?: string;
  item?: string;
  // 지정 승인자
  approver?: string;
  approverId?: string;
  approverName?: string;
  status: TReservationStatus;
  processedBy?: string;
  processedByName?: string;
  processedAt?: string;
  rejectReason?: string;
  memo: string;
  // 신청 양식 응답
  applicationResponses?: TApplicationResponse[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// 일괄 슬롯 생성 규칙
export type TSlotBulkRule = {
  startDate: string;
  endDate: string;
  days: number[];
  timeSlots?: { startTime: string; endTime: string }[];
  labels?: string[];
  items?: string[];
  capacity: number;
  excludeDates?: string[];
};
