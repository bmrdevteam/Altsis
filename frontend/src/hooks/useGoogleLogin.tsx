/**
 * @file useGoogleLogin
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *  - useGoogleLogin hook
 *  - GoogleLoginBtn component
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *  - one Tap user not apearing -> GoogleLoginBtn component
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import axios from "axios";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

/**
 *
 *  hook to enable google login in react
 *
 *  @returns {boolean} whether the script has loaded or not
 *
 *  @version 1.0 initial version
 */
export default function useGoogleLogin(academyId: string) {
  // script script
  const [loadingScript, setLoadingScript] = useState<boolean>(true);
  const { UserAPI } = useAPIv2();

  //load script on load
  useEffect(() => {
    /**
     * fuction to load
     *
     * @returns none
     *
     * @version 1.0 initial version
     *
     * @example getScriptTag()
     */
    function getScriptTag() {
      document.getElementById("googleOauthScript")?.remove();

      //create the script tag
      let script: HTMLScriptElement = document.createElement("script");

      // fill in the tag
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "googleOauthScript";

      //append to the body
      document.body.appendChild(script);
    }

    // call the function
    getScriptTag();

    // set the script  of the script to false
    setLoadingScript(false);
  }, []);

  /**
   *
   * window function to handle the callback triggered from google login
   *
   * @param response - added in the callback function
   *
   */
  window.handleGoogleLogin = function (response: any) {
    UserAPI.LoginGoogle({
      data: {
        credential: response.credential,
        academyId,
      },
    })
      .then(() => {
        //redirect the user to the index page on success
        window.location.replace("/");
      })
      .catch((err) => {
        ALERT_ERROR(err);
      });
  };

  //return script loading state
  return loadingScript;
}

/**
 * Google login button component
 *
 * @returns Google login button component
 *
 * @example <GoogleLoginBtn/>
 *
 * @version 1.0 initial version
 */
export const GoogleLoginBtn = ({ academyId }: { academyId: string }) => {
  // to check if sb is logged in ( currentUser = null )
  const { currentUser } = useAuth();

  // get the loading state from the useGoogleLogin 🪝 hook
  const status = useGoogleLogin(academyId);

  // returns the component
  return (
    <>
      {!status && (
        <>
          <div
            id="g_id_onload"
            // get the GOOGLE_CLIENT_ID from the env file
            data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID}
            // enable one tap login (not working for some reason) - maintance
            data-auto_prompt={currentUser === null}
            // declare the callback function
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
