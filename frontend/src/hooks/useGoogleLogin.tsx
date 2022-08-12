import axios from "axios";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";

export default function useGoogleLogin() {
  const [loadingScript, setLoadingScript] = useState<boolean>(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const getScriptTag = () => {
      document.getElementById("googleOauthScript")?.remove();

      let script: HTMLScriptElement = document.createElement("script");

      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "googleOauthScript";

      document.body.appendChild(script);
    };
    getScriptTag();

    setLoadingScript(false);
  }, []);

  window.handleGoogleLogin = function (response: any) {
    axios
      .post(
        `${process.env.REACT_APP_SERVER_URL}/api/user/google/auth`,
        {
          credential: response.credential,
        },
        { withCredentials: true }
      )
      .then((res) => {
        console.log(res);

        //save to token
      });
  };

  return loadingScript;
}
export const GoogleLoginBtn = () => {
  const { currentUser } = useAuth();
  const status = useGoogleLogin();
  return (
    <>
      {!status && (
        <>
          <div
            id="g_id_onload"
            data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID}
            data-auto_prompt={currentUser === null}
            data-callback="handleGoogleLogin"
          ></div>
          <div
            style={{ display: "flex", justifyContent: "center" }}
            className="g_id_signin"
            data-type="standard"
            data-size="large"
            data-theme="outline"
            data-text="sign_in_with"
            data-shape="rectangular"
            data-logo_alignment="center"
          ></div>
        </>
      )}
    </>
  );
};
