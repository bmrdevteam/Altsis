const pattern = {
  userId: "^[a-z|A-Z|0-9]{4,20}$",
  userName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$",
  password: "^(?=.*?[!@#$%^&*()])[a-z|A-Z|0-9|!@#$%^&*()]{8,26}$",
  email: "@",
  tel: "^[0-9]{3}-[0-9]{4}-[0-9]{4}$",
};

module.exports = (type, val) => {
  if (pattern[type]) return new RegExp(pattern[type]).test(val);
  return false;
};
