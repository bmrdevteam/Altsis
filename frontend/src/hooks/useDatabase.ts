import axios from "axios";

export default function useDatabase() {
  interface IDatabaseQuery {
    location: "schools" | "academies";
    id: string;
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
    };

    axios(config)
      .then((response) => {
        return JSON.stringify(response.data);
      })
      .catch(function (error) {
        return JSON.stringify(error);
      });
  }
  function R({ location, id }: IDatabaseQuery) {
    const config = {
      method: "get",
      url: `${process.env.REACT_APP_SERVER_URL}/api/${location}`,
      headers: {},
    };

    axios(config)
      .then((response) => {
        return JSON.stringify(response.data);
      })
      .catch(function (error) {
        return JSON.stringify(error);
      });
  }
  function U({ location, id }: IDatabaseQuery) {}
  function D({ location, id }: IDatabaseQuery) {}

  return { C, R, U, D };
}
