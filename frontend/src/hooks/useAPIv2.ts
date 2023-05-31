/**
 * @file uesAPIv2 hook
 *
 *
 * @author <jessie129j@gmail.com>
 *
 */

import useDatabase from "hooks/useDatabase";

import { MESSAGE } from "./_message";
import { TAcademy } from "types/academies";
import { TAdmin } from "types/users";

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

export const ALERT_ERROR = (err: any) => {
  let message = "";
  if (err.response?.data?.message) {
    message += MESSAGE.get(err.response.data.message) ?? "";
    if (message === "") {
      message += MESSAGE.get("UNKNOWN");
      message += `\n\nstatus: ${err.response.status}`;
      message += `\nmessage: ${err.response.data.message}`;
    }
  } else {
    message += MESSAGE.get("UNKNOWN");
  }
  alert(message);
};

export default function useApi() {
  const database = useDatabase();

  /**
   * API FUNCTIONS
   */

  /**
   * Academy API
   * ##########################################################################
   */

  /**
   * CAcademy API
   * 아카데미 생성 API
   * @auth owner
   * @returns academy
   * @returns admin
   */
  async function CAcademy(props: {
    data: {
      academyId: string;
      academyName: string;
      adminId: string;
      adminName: string;
      email?: string;
      tel?: string;
    };
  }) {
    const { academy, admin } = await database.C({
      location: `academies`,
      data: props.data,
    });
    return {
      academy: academy as TAcademy,
      admin: admin as TAdmin,
    };
  }

  /**
   * RAcademy API
   * 아카데미 조회 API
   * @auth not-logged-in user
   * @returns academy
   */

  async function RAcademy(props: {
    query: {
      academyId: string;
    };
  }) {
    const { academy } = await database.R({
      location: `academies` + QUERY_BUILDER(props.query),
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * RAcademies API
   * 아카데미 목록 조회 API
   * @auth owner
   * @returns academies
   */

  async function RAcademies() {
    const { academies } = await database.R({
      location: `academies`,
    });
    return {
      academies: academies as TAcademy[],
    };
  }

  /**
   * UAcademyEmail API
   * 아카데미 이메일 변경
   * @auth owner
   * @returns academies
   */

  async function UAcademyEmail(props: {
    params: {
      academyId: string;
    };
    data: {
      email?: string;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/email`,
      data: props.data,
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * UAcademyTel API
   * 아카데미 전화번호 변경
   * @auth owner
   * @returns academies
   */

  async function UAcademyTel(props: {
    params: {
      academyId: string;
    };
    data: {
      tel?: string;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/tel`,
      data: props.data,
    });
    return {
      academy: academy as TAcademy,
    };
  }

  return {
    AcademyAPI: {
      CAcademy,
      RAcademy,
      RAcademies,
      UAcademyEmail,
      UAcademyTel,
    },
  };
}
