/**
 * @file
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 * - useContentReload Hook
 *
 * -------------------------------------------------------
 *
 * NOTES
 * - still fix the problem with zustand
 *
 */


import { create } from "zustand";

interface IStore {
  contentReload: number;
  updateContentReload: () => void;
}
const useContentReload = create<IStore>((set) => ({
  contentReload: 0,
  updateContentReload: () =>
    set((state: any) => ({ contentReload: state.contentReload + 1 })),
}));

export default useContentReload;
