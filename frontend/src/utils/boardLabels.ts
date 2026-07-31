import { TBoard } from "types/board";

/** 보드·수업 메타에서 표시용 시즌 문자열 */
export const getBoardSeasonLabel = (board: TBoard): string | null => {
  if (board.seasonYear && board.seasonTerm) {
    return `${board.seasonYear} ${board.seasonTerm}`;
  }
  if (board.syllabusMeta?.year && board.syllabusMeta?.term) {
    return `${board.syllabusMeta.year} ${board.syllabusMeta.term}`;
  }
  return null;
};

/** 시즌 범위 보드이거나 수업(학습계획서) 연결 보드 */
export const isSeasonLinkedBoard = (board: TBoard): boolean => {
  if (board.scope === "season") return true;
  if (board.syllabus || board.syllabusMeta) return true;
  return false;
};

/** 학교 전용(시즌·수업 시즌에 묶이지 않은) 보드 */
export const isSchoolOnlyBoard = (board: TBoard): boolean => {
  return (board.scope || "school") === "school" && !isSeasonLinkedBoard(board);
};

/**
 * 범위 칩 라벨.
 * - 시즌 보드 / 수업 보드: 학년도·학기
 * - 그 외: 학교
 */
export const getBoardScopeLabel = (board: TBoard): string => {
  const season = getBoardSeasonLabel(board);
  if (board.scope === "season") return season || "시즌";
  if ((board.syllabus || board.syllabusMeta) && season) return season;
  return "학교";
};
