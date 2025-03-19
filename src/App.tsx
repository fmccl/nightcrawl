import { JSXElementConstructor, useEffect, useState } from "react";
import styles from "./App.module.css";
import { controls, ControlSpec } from "./controls";

function getNoteFrequency(key, octave) {
  const keyMap = {
    a: "C",
    w: "C#",
    s: "D",
    e: "D#",
    d: "E",
    f: "F",
    t: "F#",
    g: "G",
    y: "G#",
    h: "A",
    u: "A#",
    j: "B",
    k: "C2",
    o: "C#2",
    l: "D2",
  };

  if (!(key in keyMap)) return null; // Invalid key

  const noteToSemitone = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
    C2: 12,
    "C#2": 13,
    D2: 14,
  };

  const A4 = 440; // Frequency of A4
  const semitoneOffset = (octave - 4) * 12 + noteToSemitone[keyMap[key]] - 9;

  return A4 * Math.pow(2, semitoneOffset / 12);
}

function App() {
  let [octave, setOctave] = useState(0); // Relative to A4

  let [node, setNode] = useState<AudioWorkletNode | null>(null);

  let [pressedKeys, setPressedKeys] = useState(new Set());

  useEffect(() => {
    window.onkeydown = (event: KeyboardEvent) => {
      if (event.key === "z") {
        setOctave(octave - 1);
        return;
      } else if (event.key === "x") {
        setOctave(octave + 1);
        return;
      }
      if (!pressedKeys.has(event.key) && node) {
        setPressedKeys(pressedKeys.add(event.key));
        node.port.postMessage({
          note: getNoteFrequency(event.key, octave + 4),
          state: "a",
        });
      }
    };

    window.onkeyup = (event) => {
      if (event.key === "z" || event.key === "x") return;
      if (node && pressedKeys.has(event.key)) {
        setPressedKeys(() => {
          pressedKeys.delete(event.key);
          return pressedKeys;
        });
        if (pressedKeys.size === 0) {
          node.port.postMessage({ state: "r" });
        } else {
          node.port.postMessage({
            note: getNoteFrequency(
              pressedKeys.values().next().value,
              octave + 4
            ),
            state: "a",
          });
        }
      }
    };
  });

  if (node === null) {
    return (
      <button
        className={styles.click}
        style={{ display: node ? "none" : "block" }}
        onClick={async () => {
          const audioCtx = new AudioContext();
          await audioCtx.audioWorklet.addModule(
            new URL("./worklet/worklet.ts", import.meta.url)
          );

          const node = new AudioWorkletNode(audioCtx, "jsdsp-worklet", {
            outputChannelCount: [1],
          });

          node.connect(audioCtx.destination);

          setNode(node);
        }}
      >
        Click to enable audio
      </button>
    );
  }

  const createControls = (controls: any, path: string[], group = false) => {
    if (controls.__control__) {
      let Component = controls.component as JSXElementConstructor<
        typeof controls.props
      >;
      return (
        <Component
          key={path.join(".")}
          {...controls.props}
          onChange={(v) => node?.port.postMessage({ path, value: v })}
        />
      );
    } else {
      return (
        <div className={group ? styles.group : styles.row}>
          <div>
            {Object.keys(controls).map((key) =>
              key == "__label__" ? <h2>{controls[key]}</h2> : <></>
            )}
          </div>
          <div>
            {Object.keys(controls).map((key) =>
              key == "__label__" ? (
                <></>
              ) : (
                createControls(controls[key], [...path, key], true)
              )
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className={styles.row}>
      {createControls(controls, [])}
      {/* <Knob
        label="Cutoff"
        maxValue={1000}
        minValue={1}
        initialValue={600}
        onChange={(v) => node?.port.postMessage({ cutoff: v })}
        units="Hz"
      />
      <Knob
        label="Resonance"
        maxValue={1.5}
        minValue={0.5}
        initialValue={0.7}
        onChange={(v) => node?.port.postMessage({ resonance: v })}
      />
      <Knob
        label="Fil. Env."
        maxValue={1}
        minValue={0}
        initialValue={1}
        onChange={(v) => node?.port.postMessage({ cutoffEnvelope: v })}
      />
      <Slider
        maxValue={2000}
        minValue={0}
        initialValue={50}
        label="Attack"
        onChange={(v) => node?.port.postMessage({ attack: v })}
        units="ms"
      />
      <Knob
        maxValue={2}
        minValue={1}
        label="Clip"
        initialValue={1}
        onChange={(v) => node?.port.postMessage({ clip: v })}
      />
      <Knob
        maxValue={2}
        minValue={1}
        label="Wave fold"
        initialValue={1}
        onChange={(v) => node?.port.postMessage({ waveFold: v })}
      />*/}
    </div>
  );
}

export default App;
