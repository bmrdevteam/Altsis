import { TBoard } from "types/board";

type BoardWithCoursePath = Pick<TBoard, "_id"> & {
  syllabusMeta?: {
    coursePath?: string | null;
  } | null;
};

/** 수업 연결 보드면 수업 문서 탭, 아니면 보드 문서 탭 */
export const getBoardDocsListPath = (board: BoardWithCoursePath): string => {
  const coursePath = board.syllabusMeta?.coursePath;
  if (coursePath) return `${coursePath}#문서`;
  return `/boards/${board._id}#문서`;
};

/** 수업 연결 보드의 수업 표면 경로. 없으면 null */
export const getBoardCourseSurfacePath = (
  board: BoardWithCoursePath,
  surface: string
): string | null => {
  const coursePath = board.syllabusMeta?.coursePath;
  if (!coursePath) return null;
  return `${coursePath}#${surface}`;
};
