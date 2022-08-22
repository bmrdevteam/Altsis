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
      console.log(error);
    }
  }
  function U({ location }: IDatabaseQuery) {}
  function D({ location }: IDatabaseQuery) {}

  return { C, R, U, D };
}
