import { useEffect, useRef, useState } from "react";
import styles from "./Knob.module.css";

export const Knob = Object.assign(
  (props: {
    label: string;
    maxValue: number;
    minValue?: number;
    initialValue?: number;
    onChange?: (value: number) => void;
    units?: string;
  }) => {
    let [value, setValue] = useState(props.initialValue ?? 0);

    useEffect(() => {
      if (props.onChange) props.onChange(value);
    }, []);

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
                  e.movementY *
                    (Math.abs(props.maxValue - props.minValue) / 100)
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
      <div className={styles.knobBox}>
        <div className={styles.tip}>{props.label}</div>
        <div
          ref={el}
          className={styles.knob}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            setClicking(true);
          }}
        >
          <div
            className={styles.pointer}
            style={{
              transformOrigin: "bottom",
              transform: `translate(0, -50%) rotate(${
                -150 +
                ((value - props.minValue) / (props.maxValue - props.minValue)) *
                  300
              }deg)`,
            }}
          />
        </div>
        <div className={styles.tip}>
          {Math.round(value * 10) / 10}
          {props.units}
        </div>
      </div>
    );
  },
  { output: 0 }
);
