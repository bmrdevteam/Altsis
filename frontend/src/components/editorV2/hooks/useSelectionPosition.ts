import { useState } from "react";

function useSelectionPosition() {
  const [selectionX, setSelectionX] = useState<number>();
  const [selectionY, setSelectionY] = useState<number>();
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  document.onselectionchange = () => {
    if (document.getSelection()?.toString() !== "") {
      setIsSelecting(true);
      let i = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
      setSelectionX(i ? i.left + window.scrollX : 0);
      setSelectionY(i ? i.top + window.scrollY : 0);
    }

    return setIsSelecting(
      window.getSelection()?.toString() !== "" ? true : false
    );
  };

  return { isSelecting, selectionX, selectionY };
}

export default useSelectionPosition;
