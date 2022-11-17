import { CSSProperties } from "react";
import { svgData } from "./svg.data";

type Props = {
  type: any;
  width?: string;
  height?: string;

  style?: CSSProperties;
};

const Svg = ({ type, width, height, style }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? "16px"}
      height={height ?? "16px"}
      viewBox="0 0 24 24"
      style={Object.assign(
        {
          minWidth: width ?? "16px",
          minHeight: height ?? "16px",
        },
        style
      )}
    >
      {svgData[type as keyof typeof svgData]}
    </svg>
  );
};

export default Svg;
