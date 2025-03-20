import { Knob } from "./Knob";
import Slider from "./Slider";

type ControlComponent = ((args: { onChange?: (any: any) => any }) => any);

type Props<T extends ControlComponent> = T extends (arg: infer A) => any ? A : never;

type Control<T extends ControlComponent> = { component: T, props: Omit<Props<T>, "onChange"> };

function control<T extends ControlComponent>(c: Control<T>): Control<T> & { "__control__": true } {
    c["__control__"] = true;
    return c as any;
}

const paramsString = window.location.search;
const params = new URLSearchParams(paramsString);
const initialValues = JSON.parse(params.get("patch") || "{}");

export const controls = {
    osc: {
        __label__: "Oscillator",
        shape: control({
            component: Knob, props: {
                label: "Shape",
                maxValue: 1,
                minValue: 0,
                initialValue: 1
            }
        }),
        waveFold: control({
            component: Knob, props: {
                label: "Fold",
                maxValue: 2,
                minValue: 1,
                initialValue: 1
            }
        }),
        clip: control({
            component: Knob, props: {
                label: "Clip",
                maxValue: 5,
                minValue: 1,
                initialValue: 1
            }
        })
    },
    filter: {
        __label__: "Filter",
        cutoff: control({
            component: Knob, props: {
                label: "Cutoff",
                maxValue: 2000,
                minValue: 1,
                initialValue: 2000,
                units: "Hz"
            }
        }),
        resonance: control({
            component: Knob, props: {
                label: "Resonance",
                maxValue: 10,
                minValue: 0.5,
                initialValue: 0.7
            }
        }),
        envelope: control({
            component: Knob, props: {
                label: "Envelope",
                maxValue: 1,
                minValue: 0,
                initialValue: 1
            }
        })
    },
    filter_envelope: envelope("Filter Envelope"),
    amp_envelope: envelope("Amp Envelope"),
}

let controlValues = {};

export function change(path: string[], value: any) {
    let cur = controlValues;
    const name = path.pop();
    for (let i = 0; i < path.length; i++) {
        if (cur[path[i]] === undefined) {
            cur[path[i]] = {};
        }
        cur = cur[path[i]];
    }
    cur[name] = value;
}

export function getInitialValue(path: string[]) {
    let cur = initialValues;
    const name = path.pop();
    for (let i = 0; i < path.length; i++) {
        if (cur[path[i]] === undefined) {
            return undefined;
        }
        cur = cur[path[i]];
    }
    return cur[name];
}

export function copyPatch() {
    return encodeURIComponent(JSON.stringify(controlValues));
}

function envelope(__label__: string) {
    return {
        __label__,
        attack: control({
            component: Slider, props: {
                label: "Attack",
                minValue: 0,
                maxValue: 2000,
                initialValue: 20,
                units: "ms"
            }
        }),
        decay: control({
            component: Slider, props: {
                label: "Decay",
                minValue: 0,
                maxValue: 2000,
                initialValue: 20,
                units: "ms"
            },
        }),
        sustain: control({
            component: Slider, props: {
                label: "Sustain",
                maxValue: 1,
                minValue: 0,
                initialValue: 0.5,
            }
        }),
        release: control({
            component: Slider, props: {
                label: "Release",
                minValue: 1,
                maxValue: 2000,
                initialValue: 20,
                units: "ms"
            },
        }),
    };
}

export type ControlSpec = { [key: string]: ControlSpec } | { __control__: true, component: ControlComponent, props: Props<ControlComponent> }

type GetControlValues<T> = T extends { "__control__": true, component: ControlComponent } ? Props<Props<T["component"]>["onChange"]> : { [Key in keyof T]: GetControlValues<T[Key]> };

export type ControlValues = GetControlValues<typeof controls>;