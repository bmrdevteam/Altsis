const pattern = {
  userId: "^[a-z|A-Z|0-9]{4,20}$",
  userName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$",
  password: "^(?=.*?[!@#$%^&*()])[a-z|A-Z|0-9|!@#$%^&*()]{8,26}$",
  email: "@",
  tel: "^[0-9]{3}-[0-9]{4}-[0-9]{4}$",

  academyId: "^[a-z|A-Z|0-9]{2,20}$",
  academyName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$",

  schoolId: "^[a-z|A-Z|0-9]{2,20}$",
  schoolName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$",
};

module.exports = (type, val) => {
  // console.log(`validate(${type},${val}) is called`);
  if (!val) return false;
  if (pattern[type]) return new RegExp(pattern[type]).test(val);
  return false;
};
