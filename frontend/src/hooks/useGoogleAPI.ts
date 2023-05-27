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

  async function RPublicEvents(props: {
    calendarId: string;
    queries: { timeMin: string; timeMax: string };
  }) {
    const res = await database.GET({
      location:
        `calendar/v3/calendars/${props.calendarId}/events` +
        QUERY_BUILDER({
          key: CALENDAR_API_KEY,
          ...props.queries,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 2500,
        }),
    });
    return res;
  }

  return {
    CalendarAPI: {
      RPublicEvents,
    },
  };
}
