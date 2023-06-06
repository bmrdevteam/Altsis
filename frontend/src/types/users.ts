export type TUser = {
  _id: string;
  auth: "owner" | "admin" | "manager" | "member";
  userId: string;
  userName: string;
  schools: {
    school: string;
    schoolId: string;
    schoolName: string;
  }[];
  tel?: string;
  email?: string;
  snsId?: { google: string };
  profile?: string;
  calendar?: string;
  academyId: string;
  academyName: string;
};
