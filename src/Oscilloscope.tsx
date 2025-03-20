import { useEffect, useRef } from "react";
import styles from "./App.module.css";

const Oscilloscope = (props: {
  analyzer: AnalyserNode;
  dataArray: Uint8Array;
  bufferLength: number;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasCtx = canvas.current.getContext("2d");

    let running = true;

    function draw() {
      if (!running) return;
      requestAnimationFrame(draw);

      props.analyzer.getByteTimeDomainData(props.dataArray);

      canvasCtx.fillStyle = "rgb(200 200 200)";
      canvasCtx.fillRect(0, 0, canvas.current.width, canvas.current.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(0 0 0)";

      canvasCtx.beginPath();

      const sliceWidth = (canvas.current.width * 1.0) / props.bufferLength;
      let x = 0;

      for (let i = 0; i < props.bufferLength; i++) {
        const v = props.dataArray[i] / 128.0;
        const y = (v * canvas.current.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.current.width, canvas.current.height / 2);
      canvasCtx.stroke();
    }

    draw();

    return () => {
      running = false;
    };
  }, []);

  return (
    <div className={styles.group}>
      <div>
        <h2>Oscilloscope</h2>
      </div>
      <div>
        <canvas ref={canvas} width="200" height="200"></canvas>
      </div>
    </div>
  );
};

export default Oscilloscope;
