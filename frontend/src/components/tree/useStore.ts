import create from "zustand";

interface IStore {
  preview: boolean;
  updatePreviewState: () => void;
}
const useStore = create<IStore>((set) => ({
  preview: false,
  updatePreviewState: () => set((state: any) => ({ preview: !state.preview })),
}));

export default useStore;
