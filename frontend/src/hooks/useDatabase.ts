import axios from "axios";
import { useState } from "react";

export default function useDatabase() {
  interface IDatabaseQuery {
    location: string
  }
  interface IDatabaseQueryC extends Omit<IDatabaseQuery, "id"> {
    data: any;
  }
  // const Location = {
  //   school: `${process.env.REACT_APP_SERVER_URL}/api/schools`,
  //   academy: `${process.env.REACT_APP_SERVER_URL}/api/academies`,
  // };

  function C({ location, data }: IDatabaseQueryC) {
    const config = {
      method: "post",
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      headers: {},
      data: data,
      withCredentials: true,
    };

    axios(config)
      .then((response) => {
        return JSON.stringify(response.data);
      })
      .catch(function (error) {
        return JSON.stringify(error);
      });
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
