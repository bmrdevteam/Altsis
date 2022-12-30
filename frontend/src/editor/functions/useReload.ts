export default function useReload() {
  let setReloadCounter: React.Dispatch<React.SetStateAction<number>>;


  
  function _init(setState: React.Dispatch<React.SetStateAction<number>>) {
    setReloadCounter = setState;
  }


  function callPageReload() {
    setReloadCounter((prev: number) => prev + 1);
  }

  return { callPageReload, _init };
}
