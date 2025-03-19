import { useEffect, useRef, useState } from "react";
import styles from "./Slider.module.css";
import knobStyles from "./Knob.module.css";

export default function (props: {
  initialValue?: number;
  minValue: number;
  maxValue: number;
  onChange?: (value: number) => void;
  label: string;
  units?: string;
}) {
  useEffect(() => {
    if (props.onChange) props.onChange(props.initialValue ?? 0);
  }, []);

  const [value, setValue] = useState(props.initialValue ?? 0);

  let [clicking, setClicking] = useState(false);

  useEffect(() => props.onChange && props.onChange(value), [value]);

  let el = useRef<HTMLDivElement>(null);

  const clickingRef = useRef(clicking);

  useEffect(() => {
    clickingRef.current = clicking;
  }, [clicking]);

  useEffect(() => {
    const mouseUpListener = (e: MouseEvent) => {
      if (e.button === 0 && clickingRef.current) {
        setClicking(false);
        document.exitPointerLock();
      }
    };

    const mouseMoveListener = (e: MouseEvent) => {
      e.preventDefault();
      window.getSelection().removeAllRanges();
      if (clickingRef.current) {
        setValue((value) =>
          Math.max(
            props.minValue,
            Math.min(
              props.maxValue,
              value -
                e.movementY * (Math.abs(props.maxValue - props.minValue) / 100)
            )
          )
        );
        el.current.requestPointerLock({ unadjustedMovement: true });
      }
    };

    window.addEventListener("mousemove", mouseMoveListener);
    window.addEventListener("mouseup", mouseUpListener);

    return () => {
      window.removeEventListener("mousemove", mouseMoveListener);
      window.removeEventListener("mouseup", mouseUpListener);
    };
  }, [clicking, value, props.maxValue, props.minValue, props.onChange]);

  return (
    <div className={knobStyles.knobBox}>
      <div className={knobStyles.tip}>{props.label}</div>
      <div
        className={styles.slider}
        onMouseDown={() => setClicking(true)}
        ref={el}
        style={{
          transform: "rotate(180deg)",
        }}
      >
        <div className={styles.tail}>
          <div
            className={styles.head}
            style={{
              top: `${
                ((value - props.minValue) / (props.maxValue - props.minValue)) *
                130
              }px`,
            }}
          />
        </div>
      </div>
      <div className={knobStyles.tip}>
        {Math.round(value * 100) / 100}
        {props.units}
      </div>
    </div>
  );
}
