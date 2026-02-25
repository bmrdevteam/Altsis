export type TAcademy = {
  _id: string;
  academyId: string;
  academyName: string;
  adminId: string;
  adminName: string;
  email?: string;
  tel?: string;
  isActivated?: boolean;
  chatEnabled?: boolean;
  boardEnabled?: boolean;
  aiEnabled?: boolean;
};
