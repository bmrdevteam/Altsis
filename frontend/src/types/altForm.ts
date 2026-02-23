export type TAltFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "file"
  | "select"
  | "multiSelect"
  | "checkbox"
  | "radio"
  | "userSelect"
  | "rating"
  | "scale"
  | "counter"
  | "approval";

export type TAltFormFieldPermission = "respondent" | "owner";

export type TAltFormField = {
  _id: string;
  label: string;
  type: TAltFormFieldType;
  permission: TAltFormFieldPermission;
  visibleToRespondent: boolean;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  order: number;
};

export type TAltFormSettings = {
  openAt?: string;
  closeAt?: string;
  allowResubmit: boolean;
};

export type TAltForm = {
  _id: string;
  board: string;
  school: string;
  creator: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  fields: TAltFormField[];
  settings: TAltFormSettings;
  sheet: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
