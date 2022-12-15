const pattern: any = {
  userId: "^[a-z|A-Z|0-9]{4,20}$",
  userName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$",
  password: "^(?=.*?[!@#$%^&*()])[a-z|A-Z|0-9|!@#$%^&*()]{8,26}$",
  email: "@",
  tel: "",
};

export default function validate(type: string, content: string) {
  if (pattern[type]) return new RegExp(pattern[type]).test(content);
  return false;
}
