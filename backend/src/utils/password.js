import crypto from "crypto";

export const generatePassword = function () {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const specialChars = "!@#$%^&*()";
  const allChars = chars + specialChars;

  const randomIndex = (max) => {
    const bytes = crypto.randomBytes(4);
    return bytes.readUInt32BE(0) % max;
  };

  // 첫 글자는 특수문자 보장
  let password = specialChars[randomIndex(specialChars.length)];
  for (let i = 0; i < 15; i++) {
    password += allChars[randomIndex(allChars.length)];
  }
  return password;
};
