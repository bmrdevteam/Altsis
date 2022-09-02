import React from "react";

const DragAndDrop = (props: { children: JSX.Element | JSX.Element[] }) => {
  return <div>{props.children}</div>;
};

const Drag = () => {
  return <div draggable>Drag</div>;
};

const Drop = () => {
  return (
    <div
      onDrop={() => {
        console.log("drop");
      }}
    >
      drop
    </div>
  );
};

export { Drop, Drag };
export default DragAndDrop;
