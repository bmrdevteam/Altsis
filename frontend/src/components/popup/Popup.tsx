const Popup = ({
  children,
  setState,
}: {
  children: JSX.Element | JSX.Element[];
  setState: any;
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display:"flex",
        justifyContent:"center",
        alignItems:"center"
      }}
    >
      <div
        style={{
          width: "100vw",
          height: "100vh",
          zIndex: 2025,
          backgroundColor: "rgba(0,0,0,0.3)",
          backdropFilter:"blur(1px)"
        }}
        onClick={() => {
          setState(false);
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          zIndex: 2026,
          backgroundColor: "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Popup;
