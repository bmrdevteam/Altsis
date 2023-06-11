import { TSyllabus } from "./syllabuses";

export type TEnrollment = TSyllabus & {
  syllabus: string;

  student: string;
  studentId: string;
  studentName: string;
  studentGrade: string;
  evaluation?: any;
  memo: string;
  isHiddenFromCalendar: boolean;
};
