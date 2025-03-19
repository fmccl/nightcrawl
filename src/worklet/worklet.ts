import { type ControlValues } from "../controls"

class JSDSPWorklet extends AudioWorkletProcessor {
    private phase: number;
    private sampleRateInv: number;
    private frequency: number = 0;

    private envelope = new Envelope({} as any);
    private filter_envelope = new Envelope({} as any);
    private lowpass = new LowPassFilter(330, 20);

    private controls: ControlValues = {} as any;

    constructor() {
        super();
        this.phase = 0;
        this.sampleRateInv = 1 / sampleRate;

        this.port.onmessage = (event) => {
            if (event.data.note) {
                this.frequency = event.data.note;

            }
            if (event.data.path) {
                let cur = this.controls;
                const name = event.data.path.pop();
                for (let i = 0; i < event.data.path.length; i++) {
                    if (cur[event.data.path[i]] === undefined) {
                        cur[event.data.path[i]] = {};
                    }
                    cur = cur[event.data.path[i]];
                }
                cur[name] = event.data.value;

                this.lowpass.resonance = this.controls.filter.resonance;
                this.envelope.controls = this.controls.amp_envelope;
                this.filter_envelope.controls = this.controls.filter_envelope;
            }
            // if (event.data.cutoff !== undefined) {
            //     this.baseCutoff = event.data.cutoff;
            // }
            // if (event.data.resonance !== undefined) {
            //     this.lowpass.resonance = event.data.resonance;
            // }
            // if (event.data.cutoffEnvelope !== undefined) {
            //     this.cutoffEnvelope = event.data.cutoffEnvelope;
            // }
            // if (event.data.attack !== undefined) {
            //     this.envelope.attack = event.data.attack;
            // }
            // if (event.data.clip !== undefined) {
            //     this.clip = event.data.clip;
            // }
            // if (event.data.waveFold !== undefined) {
            //     this.waveFold = event.data.waveFold;
            // }
            if (event.data.state) {
                this.envelope.state = event.data.state;
                this.filter_envelope.state = event.data.state;
            }
        }
    }

    process(_inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
        const output = outputs[0];
        if (!output) return true;

        let samplesPerCall = output[0].length;

        let volume = this.envelope.process(samplesPerCall);
        this.lowpass.cutoff = this.controls.filter.cutoff + this.controls.filter.envelope * (this.filter_envelope.process(samplesPerCall) * 2000);

        const phaseIncrement = 2 * Math.PI * this.frequency * this.sampleRateInv;

        for (let channel = 0; channel < output.length; channel++) {
            const outputChannel = output[channel];
            for (let i = 0; i < outputChannel.length; i++) {
                let wave = this.controls.osc.shape * saw(this.phase) + (1 - this.controls.osc.shape) * Math.sin(this.phase);
                wave *= this.controls.osc.clip;
                if (wave > 1) {
                    wave = 1;
                }
                if (wave < -1) {
                    wave = -1;
                }
                wave *= this.controls.osc.waveFold
                if (wave > 1) {
                    wave = 1 - wave;
                } else if (wave < -1) {
                    wave = -1 + wave;
                }
                outputChannel[i] = this.lowpass.process(wave * volume);
                // outputChannel[i] = Math.sin(this.phase) * volume;
                this.phase += phaseIncrement;
                if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
            }
        }

        return true;
    }
}



function saw(phase: number) {
    return 2 * Math.PI - phase;
}

class Envelope { // TODO: Curve

    private sampleRateInv: number;

    #state: "a" | "d" | "s" | "r" = "r";

    private time = 0;

    private releaseVolume = 0;

    set state(v: "r" | "a" | "d" | "s") { this.#state = v; this.time = 0; }

    constructor(public controls: { attack: number, decay: number, sustain: number, release: number }) {
        this.sampleRateInv = 1 / sampleRate;
    }

    process(samplesPerCall: number): number {

        let volume = 0;
        if (this.#state === "a" && this.controls.attack === 0) this.#state = "d";
        if (this.#state === "a") {
            volume = this.time / this.controls.attack;
            this.releaseVolume = volume;
            if (this.time >= this.controls.attack) {
                this.#state = "d";
                console.log("d");
                this.time = 0;
            }
        } else if (this.#state === "d") {
            if (this.controls.decay === 0) {
                this.#state = "s";
                this.time = 0;
                volume = this.controls.sustain;
                this.releaseVolume = volume;
            } else {
                volume = this.controls.sustain + ((this.controls.decay - this.time) / this.controls.decay) * (1 - this.controls.sustain);
                this.releaseVolume = volume;
                if (this.time > this.controls.decay) {
                    this.time = 0;
                    this.#state = "s";
                    console.log("s");
                }
            }

        } else if (this.#state === "s") {
            volume = this.controls.sustain;
            this.releaseVolume = volume;
            this.time = 0;
        } else {

            volume = Math.max(0, this.releaseVolume - ((this.time) / this.controls.release) * this.releaseVolume);
        }

        this.time += this.sampleRateInv * 1000 * samplesPerCall;

        return volume;
    }

}

class LowPassFilter {
    private xn1: number = 0;
    private xn2: number = 0;
    private yn1: number = 0;
    private yn2: number = 0;
    #cutoff: number = 0;
    #resonance: number = 0;

    private a0 = 0;
    private a1 = 0;
    private a2 = 0;
    private b0 = 0;
    private b1 = 0;
    private b2 = 0;

    set cutoff(v: number) {
        this.#cutoff = v;
        this.recalculateCoefficients();
    }

    set resonance(v: number) {
        this.#resonance = v;
        this.recalculateCoefficients();
    }

    constructor(cutoff: number, resonance: number = 0) {
        this.cutoff = cutoff;
        this.resonance = resonance;
    }

    private recalculateCoefficients() {
        let wc = 2 * Math.PI * this.#cutoff / sampleRate;
        let a = Math.sin(wc) / (2 * this.#resonance);
        this.b0 = (1 - Math.cos(wc)) / 2;
        this.b1 = 1 - Math.cos(wc);
        this.b2 = this.b0;
        this.a0 = 1 + a;
        this.a1 = -2 * Math.cos(wc);
        this.a2 = 1 - a;
    }

    process(sample: number): number {
        let out = (this.b0 * sample + this.b1 * this.xn1 + this.b2 * this.xn2
            - this.a1 * this.yn1 - this.a2 * this.yn2) / this.a0;

        // Shift past samples
        this.xn2 = this.xn1;
        this.xn1 = sample;
        this.yn2 = this.yn1;
        this.yn1 = out;

        return out;
    }

}

registerProcessor("jsdsp-worklet", JSDSPWorklet)