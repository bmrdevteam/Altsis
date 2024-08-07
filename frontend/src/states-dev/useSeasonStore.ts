import { create } from "zustand";

interface IStore {
  selectedSeason: any;
  setSelectedSeason: (season: any) => void;
}
const useSeasonStore = create<IStore>((set) => ({
  selectedSeason: {},
  setSelectedSeason: (season: any) => {
    set({ selectedSeason: season });
  },
}));

export default useSeasonStore;
