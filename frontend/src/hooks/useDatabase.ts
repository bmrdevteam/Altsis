import axios from "axios";

/**
 *
 * React hook to Implement CRUD using axios
 *
 *
 * @params none
 * @returns {} { C , R , U , D }
 * @version 1.0 - inital version (only create and read functions are avaliable )
 * @see https://documenter.getpostman.com/view/21807335/UzJHRyKX

 */

export default function useDatabase() {
  interface IDatabaseQuery {
    location: string;
  }
  interface IDatabaseQueryC extends Omit<IDatabaseQuery, "id"> {
    data: any;
  }

  /**
   * function that create to the database
   *
   * @async
   * @param {string} {location}
   * @param {object | string | number} {data}
   * @returns
   */

  async function C({ location, data }: IDatabaseQueryC) {
    const config = {
      method: "post",
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      headers: {},
      data: data,
      withCredentials: true,
    };

    if (data !== null || undefined) {
      try {
        const result = await axios(config);
        return result;
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
  }

  /**
   * function that read from the database
   * @async
   * @param {string} {location} - SeverLocation/api/{location}
   * @returns
   */
  async function R({ location }: IDatabaseQuery) {
    const config = {
      method: "get",
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      headers: {},
      withCredentials: true,
    };
    try {
      const { data: result } = await axios(config);
      return result;
    } catch (error) {
      throw error;
    }
  }
  function U({ location }: IDatabaseQuery) {}
  async function D({ location }: IDatabaseQuery) {
    const config = {
      method: "delete",
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      headers: {},
      withCredentials: true,
    };
    try {
      const { data: result } = await axios(config);
      return result;
    } catch (error) {
      throw error;
    }
  }

  return { C, R, U, D };
}
