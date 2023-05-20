/**
 * @file useGoogleAPI hook
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import axios from "axios";
import { useEffect, useState } from "react";
import useApi from "./useApi";
import { useAuth } from "contexts/authContext";

const GOOGLE_URL = "https://www.googleapis.com";

const useGoogleDatabase = () => {
  interface IDatabaseQuery {
    location: string;
  }
  interface IDatabaseQueryC extends IDatabaseQuery {
    data: any;
  }

  async function POST({ location, data }: IDatabaseQueryC) {
    const config = {
      method: "post",
      url: `${GOOGLE_URL}/${location}`,
      headers: {},
      data: data,
    };
    if (data) {
      try {
        const { data: result } = await axios(config);
        return result;
      } catch (error) {
        throw error;
      }
    }
  }

  async function GET({ location }: IDatabaseQuery) {
    const config = {
      method: "get",
      url: `${GOOGLE_URL}/${location}`,
      headers: {},
    };
    try {
      const { data: result } = await axios(config);
      return result;
    } catch (error) {
      //throw an error
      throw error;
    }
  }

  //returns functions
  return { POST, GET };
};

/**
 * @file useGoogleAPI hook
 *
-------------------------------------------------------
 *
 * NOTES
 *
 */
const CALENDAR_API_KEY = process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY;

export default function useGoogleAPI() {
  const database = useGoogleDatabase();
  const { WorkspaceApi } = useApi();
  const { currentWorkspace, setCurrentWorkspace } = useAuth();

  const [accessToken, setAccessToken] = useState<string>("");
  const [expires, setExpires] = useState<Date>(new Date());
  const [refreshToken, setRefreshToken] = useState<string>("");

  useEffect(() => {
    if (currentWorkspace) {
      setAccessToken(currentWorkspace.accessToken);
      setExpires(new Date(currentWorkspace.expires));
      setRefreshToken(currentWorkspace.refreshToken);
    }

    return () => {};
  }, [currentWorkspace]);

  /**
   * API FUNCTIONS
   */
  function QUERY_BUILDER(params?: object) {
    let query = "";
    if (params) {
      query = "?";
      for (const [key, value] of Object.entries(params)) {
        query = query.concat(`${key}=${value}&`);
      }
    }
    return query;
  }

  function getTokens() {
    return { accessToken, refreshToken };
  }

  async function getAccessToken() {
    if (new Date() >= expires) {
      console.log("REFRESH TOKEN!");
      const { access_token } = await database.POST({
        location: `oauth2/v4/token`,
        data: {
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          client_secret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        },
      });

      const expires = new Date();
      expires.setHours(expires.getHours() + 1);
      const { workspace } = await WorkspaceApi.UMyWorkspaceAccessToken({
        data: {
          accessToken: access_token,
          expires,
        },
      });
      setCurrentWorkspace(workspace);
      return access_token;
    }
    return accessToken;
  }

  /**
   * ###################################
   * Calendar API
   * ###################################
   */

  /**
   * List Calendars
   */

  async function RCalendars() {
    const res = await database.GET({
      location:
        `calendar/v3/users/me/calendarList` +
        QUERY_BUILDER({
          key: CALENDAR_API_KEY,
          access_token: await getAccessToken(),
        }),
    });
    console.log(res);
    return res.items;
  }

  return {
    getTokens,
    CalendarAPI: {
      RCalendars,
    },
  };
}
