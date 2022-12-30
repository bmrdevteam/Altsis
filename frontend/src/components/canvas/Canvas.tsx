import { useEffect, useRef } from "react";

import React from "react";

type Props = {};

const Canvas = (props: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio;
      canvas.style.width = `${500}px`;
      canvas.style.height = `${500}px`;

      canvas.width = 500 * dpr;
      canvas.height = 500 * dpr;
      if (ctx) {
        ctx.scale(dpr, dpr);


        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(10, 490);
        ctx.lineTo(490, 490);
        ctx.lineWidth = 1; //요렇게 사용한다.
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(250, 290, 12, 200);
        ctx.fillRect(200, 250, 12, 240);
        ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
        ctx.fillRect(150, 210, 12, 280);
        ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
        ctx.fillRect(300, 290, 12, 200);
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fillRect(50, 270, 12, 220);
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(100, 270, 12, 220);
      }
    }
    return () => {};
  }, []);

  return <canvas ref={canvasRef} />;
};

export default Canvas;
