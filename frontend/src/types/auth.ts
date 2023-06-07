import { TRegistration } from "./registrations";
import { TSeason } from "./seasons";
import { TUser } from "./users";

export type TCurrentUser = TUser & {
  registrations: TCurrentRegistration[];
};

export type TCurrentRegistration = TRegistration;

export type TCurrentSeasonRegistration = {
  _id: string;
  user: string;
  userId: string;
  userName: string;
  role?: "teacher" | "student";
  grade?: string;
  teacher?: string;
  teacherId?: string;
  teacherName?: string;
  subTeacher?: string;
  subTeacherId?: string;
  subTeacherName?: string;
  group?: string;
};

export type TCurrentSeason = TSeason & {
  registrations: TCurrentSeasonRegistration[];
};
