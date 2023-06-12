/**
 * @file useApi hook
 *
 * database api hook using useDatabase
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - useApi hook
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
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import useDatabase from "hooks/useDatabase";
import _ from "lodash";
export default function useApi() {
  const database = useDatabase();

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

  function QUERY_SUB_BUILDER(params: string[] | string) {
    return _.join(params, ",");
  }

  /**
   * Registration Api
   * ##########################################################################
   */

  /**
   * Create Memo
   * @type POST
   * @auth member
   * @returns memos
   */
  async function CMemo(params: {
    rid: string;
    memo: {
      title: string;
      day: string;
      start: string;
      end: string;
      classroom?: string;
      memo?: string;
    };
  }) {
    const result = await database.C({
      location: "memos",
      data: { registration: params.rid, ...params.memo },
    });
    return result;
  }

  /**
   * Update Memo
   * @type PUT
   * @auth member
   * @returns memos
   */
  async function UMemo(params: {
    _id: string;
    rid: string;
    memo: {
      title: string;
      day: string;
      start: string;
      end: string;
      classroom?: string;
      memo?: string;
    };
  }) {
    const result = await database.U({
      location: "memos/" + params._id,
      data: { registration: params.rid, ...params.memo },
    });
    return result;
  }

  /**
   * Delete Memo
   * @type DELETE
   * @auth member
   * @returns memos
   */
  async function DMemo(params: { _id: string; rid: string }) {
    const result = await database.D({
      location:
        "memos/" + params._id + QUERY_BUILDER({ registration: params.rid }),
    });
    return result;
  }

  return {
    RegistrationApi: {
      CMemo,
      UMemo,
      DMemo,
    },
  };
}
