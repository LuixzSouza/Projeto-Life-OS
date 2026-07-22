// ============================================================================
// MOTOR DE SONS AMBIENTE (Web Audio API) — 100% offline, sem áudio externo.
// ============================================================================
// Inspirado no Spotify/Forest/lofi, mas fiel à filosofia do projeto: nada de
// streaming nem arquivos de áudio (respeita a CSP e funciona offline/privado).
// Todas as camadas são SINTETIZADAS no navegador a partir de ruído + filtros:
//   - Ruído branco/rosa/marrom (geradores clássicos)
//   - Chuva  = ruído branco filtrado (hiss agudo)
//   - Ondas  = ruído marrom grave com LFO lento no volume (marés indo e vindo)
//   - Vento  = ruído rosa num passa-banda com LFO varrendo a frequência
// O contexto de áudio só nasce após um gesto do usuário (regra dos browsers).

export type FocusSoundId = "rain" | "ocean" | "wind" | "white" | "pink" | "brown";

export interface FocusSoundDef {
  id: FocusSoundId;
  label: string;
  hint: string;
}

export const FOCUS_SOUNDS: FocusSoundDef[] = [
  { id: "rain", label: "Chuva", hint: "Chuva suave e constante — o clássico para concentrar." },
  { id: "ocean", label: "Ondas", hint: "Mar indo e vindo — respiração lenta, relaxa a mente." },
  { id: "wind", label: "Vento", hint: "Vento distante — atmosfera calma sem monotonia." },
  { id: "white", label: "Ruído branco", hint: "Mascara barulhos externos — ótimo em ambiente agitado." },
  { id: "pink", label: "Ruído rosa", hint: "Mais grave e macio que o branco — menos cansativo." },
  { id: "brown", label: "Ruído marrom", hint: "Bem grave, tipo cachoeira — profundo e envolvente." },
];

type NoiseKind = "white" | "pink" | "brown";

// Gera alguns segundos de ruído e devolve um buffer para tocar em loop.
function makeNoiseBuffer(ctx: AudioContext, kind: NoiseKind, seconds = 4): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (kind === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (kind === "pink") {
    // Algoritmo de Paul Kellet (aproximação de ruído rosa).
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Ruído marrom (integração do branco).
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

interface Layer {
  gain: GainNode;      // volume desta camada (0..1 * fator interno)
  volume: number;      // volume "lógico" pedido pelo usuário (0..1)
  nodes: AudioNode[];  // nós a desligar quando parar
  playing: boolean;
}

/**
 * Mixer de sons ambiente. Uma instância por página/componente. Cria o
 * AudioContext preguiçosamente (no primeiro play) e mantém cada camada
 * independente, com volume próprio e um volume-mestre global.
 */
export class FocusSoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers = new Map<FocusSoundId, Layer>();
  private masterVol = 0.7;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVol;
      this.master.connect(this.ctx.destination);
    }
    // Alguns browsers suspendem o contexto até um gesto; retoma aqui.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private buildLayer(id: FocusSoundId): Layer {
    const ctx = this.ensureContext();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master!);
    const nodes: AudioNode[] = [gain];

    const source = ctx.createBufferSource();
    source.loop = true;

    if (id === "white" || id === "pink" || id === "brown") {
      source.buffer = makeNoiseBuffer(ctx, id);
      source.connect(gain);
    } else if (id === "rain") {
      source.buffer = makeNoiseBuffer(ctx, "white");
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 900;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 8000;
      source.connect(hp).connect(lp).connect(gain);
      nodes.push(hp, lp);
    } else if (id === "ocean") {
      source.buffer = makeNoiseBuffer(ctx, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600;
      // LFO lento (~0,08 Hz) modula o volume: a "maré" sobe e desce.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.35;
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      lfo.connect(lfoGain).connect(swell.gain);
      source.connect(lp).connect(swell).connect(gain);
      lfo.start();
      nodes.push(lp, lfo, lfoGain, swell);
    } else {
      // wind
      source.buffer = makeNoiseBuffer(ctx, "pink");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 500;
      bp.Q.value = 1.2;
      // LFO varre a frequência do passa-banda: rajadas suaves.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain).connect(bp.frequency);
      source.connect(bp).connect(gain);
      lfo.start();
      nodes.push(bp, lfo, lfoGain);
    }

    source.start();
    nodes.push(source);
    return { gain, volume: 0.6, nodes, playing: false };
  }

  /** Liga/desliga uma camada; devolve o novo estado (true = tocando). */
  toggle(id: FocusSoundId): boolean {
    let layer = this.layers.get(id);
    if (!layer) {
      layer = this.buildLayer(id);
      this.layers.set(id, layer);
    }
    layer.playing = !layer.playing;
    this.applyGain(layer);
    return layer.playing;
  }

  /** Ajusta o volume de uma camada (0..1). Cria a camada se não existir. */
  setVolume(id: FocusSoundId, volume: number) {
    let layer = this.layers.get(id);
    if (!layer) {
      layer = this.buildLayer(id);
      this.layers.set(id, layer);
    }
    layer.volume = Math.max(0, Math.min(1, volume));
    this.applyGain(layer);
  }

  private applyGain(layer: Layer) {
    if (!this.ctx) return;
    const target = layer.playing ? layer.volume * 0.6 : 0; // teto p/ não estourar
    layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
  }

  setMasterVolume(volume: number) {
    this.masterVol = Math.max(0, Math.min(1, volume));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.masterVol, this.ctx.currentTime, 0.1);
    }
  }

  isPlaying(id: FocusSoundId): boolean {
    return this.layers.get(id)?.playing ?? false;
  }

  anyPlaying(): boolean {
    for (const l of this.layers.values()) if (l.playing) return true;
    return false;
  }

  /** Silencia tudo sem destruir o contexto (pausa rápida). */
  pauseAll() {
    for (const layer of this.layers.values()) {
      layer.playing = false;
      this.applyGain(layer);
    }
  }

  /** Desliga tudo e libera o contexto de áudio (ao desmontar). */
  dispose() {
    for (const layer of this.layers.values()) {
      for (const node of layer.nodes) {
        try {
          if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) node.stop();
          node.disconnect();
        } catch {
          /* nó já parado/desconectado */
        }
      }
    }
    this.layers.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
