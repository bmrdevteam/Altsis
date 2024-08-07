import { create } from "zustand";

interface IStore {
  preview: boolean;

  updatePreviewState: () => void;
}
const useEditorStore = create<IStore>((set) => ({
  preview: false,
  updatePreviewState: () => set((state: any) => ({ preview: !state.preview })),
}));

export default useEditorStore;
