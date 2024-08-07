import { create } from "zustand";

interface IStore {
  reload: boolean;
  setReload: (to: boolean) => void;
}
const useReloadState = create<IStore>((set) => ({
  reload: false,
  setReload: (to: boolean) => {
    set({ reload: to });
  },
}));

export default useReloadState;
