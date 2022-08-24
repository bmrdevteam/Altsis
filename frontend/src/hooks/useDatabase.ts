import axios from "axios";

export default function useDatabase() {
  interface IDatabaseQuery {
    location: string;
  }
  interface IDatabaseQueryC extends Omit<IDatabaseQuery, "id"> {
    data: any;
  }
  // const Location = {
  //   school: `${process.env.REACT_APP_SERVER_URL}/api/schools`,
  //   academy: `${process.env.REACT_APP_SERVER_URL}/api/academies`,
  // };

  /**
   * function that reads from the database
   * 
   * @async
   * @param {string} location
   * @param {object} data
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
