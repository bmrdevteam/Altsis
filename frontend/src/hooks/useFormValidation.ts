/**
 * @file useFormValidation hook
 * 
 * !!DISCLAMER!! the file is no longer supported
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 * useFormValidation - unuse of hook
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */






import { useState } from "react";

type Props = {
  type: string;
  content: string;
};
export default function useFormValidation(props: Props) {
  const msg: string = "";
  const [isValid, setIsValid] = useState<boolean>(true);

  
  switch (props.type) {
    case "email":
      setIsValid(new RegExp("@").test(props.content))
      break;
    case "username":
      let regex = new RegExp("^[a-zA-Z0-9]{4,20}$")
      setIsValid(regex.test(props.content));
      break;
    default:
  }

  return { isValid, msg };
}
