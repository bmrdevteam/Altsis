export type TSchool = {
  _id: string;
  school: string;
  schoolId: string;
  schoolName: string;
  formArchive: {
    label: string;
    dataType: "array" | "object";
    fields: any[];
    authTeacher: "undefined" | "viewAndEditStudents" | "viewAndEditMyStudents";
    authStudent: "undefined" | "view";
  }[];
  links: {
    url: string;
    title: string;
  }[];
  calendar?: string;
  calendarTimetable?: string;
};
