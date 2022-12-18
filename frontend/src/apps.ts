import useDatabase from "hooks/useDatabase";

export const Apps = () => {
  const database = useDatabase();
  
  async function getApps() {
    const apps = await database.R({
      location: `apps/`,
    });
    return apps;
  }

  getApps()
    .then((res) => {
      console.log(res)
      return [res]
    })
    .catch(() => {
      alert("failed to load data");
    });
}