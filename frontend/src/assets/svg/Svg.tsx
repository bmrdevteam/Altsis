import { svgData } from "./svg.data";

type Props = {
  type: any;
  width?: string;
  height?: string;
  fill?: string;
};

const Svg = ({ type, width, height, fill }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? "16"}
      height={height ?? "16"}
      viewBox="0 0 24 24"
      style={{ fill: fill }}
    >
      {svgData[type as keyof typeof svgData]}
    </svg>
  );
};

export default Svg;
