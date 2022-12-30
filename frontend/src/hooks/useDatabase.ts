/**
 * @file useDatabase hook
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *  - useDataBase.C function
 *  - useDataBase.R function
 *  - useDataBase.D function
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *  - useDataBase.U function
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

/**
 *
 * React hook to Implement CRUD using axios
 *
 *
 * @params none
 *
 * @returns {} { C , R , U , D }
 *
 * @version 1.0 - inital version (only create and read functions are avaliable )
 *
 * @see https://documenter.getpostman.com/view/21807335/UzJHRyKX
 */

export default function useDatabase() {
  interface IDatabaseQuery {
    location: string;
  }
  interface IDatabaseQueryC extends IDatabaseQuery {
    data: any;
  }

  /**
   * function that create to the database
   *
   * @async
   *
   * @param {string} {location}
   * @param {object | string | number} {data}
   *
   * @returns retrived data or throws an error
   *
   * @example C(location: {"/users/list"}, data: {username: "foo",password: "password1!"})
   *
   * @version 1.0 initial version
   */

  async function C({ location, data }: IDatabaseQueryC) {
    const config = {
      // set the method
      method: "post",
      //set the url
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      //set the header
      headers: {},
      // pass in the data from props
      data: data,
      // send request with 🍪 cookies
      withCredentials: true,
    };
    // check if data is not null or undefined or ''
    if (data) {
      //
      try {
        // asynchronously call axios
        const { data: result } = await axios(config);

        // return result
        return result;
      } catch (error) {
        // throw an error
        throw error;
      }
    }
  }

  /**
   * function that read from the database
   *
   * @async
   *
   * @param {string} {location} - SeverLocation/api/{location}
   *
   * @returns retrived data or throws an error
   *
   * @example R({location: "users/list"})
   *
   * @version 1.0 initial version
   *
   */
  async function R({ location }: IDatabaseQuery) {
    const config = {
      /**
       * set the method
       */
      method: "get",
      /**
       * set the url
       */
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      /**
       * set the headers
       */
      headers: {},
      /**
       * send request with 🍪 cookies
       */

      withCredentials: true,
    };
    try {
      // asynchronously call axios
      const { data: result } = await axios(config);

      // return the response data
      return result;
    } catch (error) {
      //throw an error
      throw error;
    }
  }

  /**
   * function that updates the database
   *
   * @async
   *
   * @param {string} {location} - SeverLocation/api/{location}
   *
   * @returns retrived data or throws an error
   *
   * @example U({location: "/users/list"})
   *
   * @version 1.0 initial version
   *
   */
  async function U({ location, data }: IDatabaseQueryC) {
    const config = {
      // set the method
      method: "put",
      //set the url
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      //set the header
      headers: {},
      // pass in the data from props
      data: data,
      // send request with 🍪 cookies
      withCredentials: true,
    };
    // check if data is not null or undefined or ''
    if (data) {
      //
      try {
        // asynchronously call axios
        const { data: result } = await axios(config);

        // return result
        return result;
      } catch (error) {
        // throw an error
        throw error;
      }
    }
  }

  /**
   * function that deletes from the database
   *
   * @async
   *
   * @param {string} {location} - SeverLocation/api/{location}
   *
   * @returns retrived data or throws an error
   *
   * @example D({location: "/users/list"})
   *
   * @version 1.0 initial version
   *
   */
  async function D({ location }: IDatabaseQuery) {
    /**
     * @constant config for the axios
     *
     */
    const config = {
      //set the method
      method: "delete",
      //set the url
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      //set the headers
      headers: {},
      // send request with 🍪 cookies
      withCredentials: true,
    };
    try {
      /** @constant config for the axios asynchronously call axios */
      const result = await axios(config);

      // return the response
      return result;
    } catch (error) {
      //throw an error
      throw error;
    }
  }

  //returns functions
  return { C, R, U, D };
}
