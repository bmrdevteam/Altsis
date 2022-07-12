import { useState } from "react";

type Props = {
  type: string;
  content: string;
};
export default function useFormValidation({ type, content }: Props) {
  const msg: string = "";
  const [isValid, setIsValid] = useState<boolean>();

  switch (type) {
    case "email":
      setIsValid(content.includes("@"));
      break;
    case "username":
      let regex = new RegExp("^[a-zA-Z0-9]{4,20}$")
      setIsValid(regex.test(content));
      break;
    default:
  }

  return { isValid, msg };
}
