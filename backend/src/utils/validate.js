const pattern = {
  userId: "^[a-zA-Z0-9]{4,20}$",
  userName: "^[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]{2,20}$",
  password: "^(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,26}$",
  email: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
  tel: "^[0-9]{3}-[0-9]{4}-[0-9]{4}$",

  academyId: "^[a-zA-Z0-9]{2,20}$",
  academyName: "^[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣 ]{2,20}$",
  adminId: "^[a-zA-Z0-9]{4,20}$",
  adminName: "^[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]{2,20}$",

  schoolId: "^[a-zA-Z0-9]{2,20}$",
  schoolName: "^[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣 ]{2,20}$",

  dateText: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
};

const validate = (type, val) => {
  if (!val) return false;
  if (pattern[type]) return new RegExp(pattern[type]).test(val);
  return false;
};

export { validate };
