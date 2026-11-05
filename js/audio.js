// Audio: ElevenLabs-generated sounds + voice (sounds/eleven) and Kenney CC0 sounds, via sfx.js
const E = (n) => `eleven/${n}.mp3`;

const ELEVEN_SFX = ["chalk","heels","hum","ambience","tick","bell","locker","chair_roll","scare1","scare2","scream",
  "drone","whisper","lights_off","flicker","video","blast","heartbeat","breath","door_creak","lofi","notify",
  "game_hit","game_coin","tension","glitch","static"];
export const VOICE_LINES = ["d1_1","d1_2","d1_3","d1_4","d1_5","d1_6","d2_2","d2_3","d2_5","d3_1","d3_2","d3_3","d3_4",
  "d3_5","d4_1","d4_2","d4_3","d4_4","d4_5","d5_1","d5_2","d5_3","d5_4","d5_5","c1","c2","c3","c4","found","hm",
  "dismiss","dismiss5","perfect"];

export class Audio {
  constructor() {
    this.sfx = new window.SFX({ base: "sounds/" });
    this.ctx = this.sfx.ctx;
    this.loops = {};
    this.muted = false;
  }
  async load(onProgress) {
    const map = {
      key: { src: ["ui/mouse_click_01.mp3"], volume: 0.5 },
      switch: { src: ["ui/switch_alt_01.mp3", "ui/switch_alt_02.mp3", "ui/switch_alt_03.mp3"], volume: 0.35 },
      book_open: { src: "rpg/book_open_01.mp3", volume: 0.9 },
      book_close: { src: "rpg/book_close_01.mp3", volume: 0.6 },
      creak: { src: ["rpg/creak_01.mp3", "rpg/creak_02.mp3"], volume: 0.5 },
      door: { src: "rpg/door_close_01.mp3", volume: 0.5 },
      clang: { src: ["impacts/metal_heavy_02.mp3", "impacts/metal_heavy_04.mp3"], volume: 0.8 },
      thump: { src: "impacts/punch_heavy_01.mp3", volume: 0.6 },
      bodyfall: { src: "impacts/soft_heavy_02.mp3", volume: 0.5 },
      gong: { src: "impacts/bell_heavy_02.mp3", volume: 0.7 },
      knock: { src: "impacts/wood_heavy_01.mp3", volume: 0.6 },
      chalk_tap: { src: ["ui/scratch_01.mp3", "ui/scratch_02.mp3"], volume: 0.25 },
      step: { src: ["footsteps/footstep_concrete_01.mp3", "footsteps/footstep_concrete_02.mp3", "footsteps/footstep_concrete_03.mp3", "footsteps/footstep_concrete_04.mp3"], volume: 0.7 },
      pep: { src: ["arcade/pep_01.mp3", "arcade/pep_03.mp3"], volume: 0.3 },
      lose: { src: "arcade/zap_three_down_01.mp3", volume: 0.3 },
      win: { src: "jingles/jingle_8bit_01.mp3", volume: 0.35 },
      glitchs: { src: "ui/glitch_01.mp3", volume: 0.3 },
    };
    for (const n of ELEVEN_SFX) map[n] = { src: E(n), volume: 1 };
    for (const n of VOICE_LINES) map["v_" + n] = { src: E(n), volume: 1 };
    // load in a few chunks so we can show progress
    const entries = Object.entries(map);
    let done = 0;
    const chunk = 12;
    for (let i = 0; i < entries.length; i += chunk) {
      await this.sfx.load(Object.fromEntries(entries.slice(i, i + chunk)));
      done += Math.min(chunk, entries.length - i);
      onProgress && onProgress(done / entries.length);
    }
    // per-sound mix tweaks
    const g = this.sfx.gains;
    Object.assign(g, { chalk: 0.35, heels: 0.8, hum: 0.25, ambience: 0.35, tick: 0.3, bell: 0.7, locker: 0.9,
      chair_roll: 0.6, scare1: 1.0, scare2: 1.0, scream: 0.8, drone: 0.5, whisper: 0.7, lights_off: 0.9, flicker: 0.5,
      video: 0.45, blast: 1.0, heartbeat: 0.6, breath: 0.8, door_creak: 0.6, lofi: 0.3, notify: 0.5, game_hit: 0.4,
      game_coin: 0.35, tension: 0.6, glitch: 0.5, static: 0.25 });
  }
  has(name) { return !!(this.sfx.buffers[name] && this.sfx.buffers[name].length); }
  duration(name, rate = 1) { const b = this.sfx.buffers[name]; return b && b[0] ? b[0].duration / rate : 0; }
  play(name, o = {}) { return this.has(name) ? this.sfx.play(name, o) : null; }
  voice(line, o = {}) {
    const n = "v_" + line;
    if (!this.has(n)) return 0;
    if (this.voiceHandle) this.voiceHandle.stop(0.05);
    this.voiceHandle = this.sfx.play(n, { vary: 0, cooldown: 0, ...o });
    return this.duration(n, o.rate || 1);
  }
  stopVoice() { if (this.voiceHandle) { this.voiceHandle.stop(0.05); this.voiceHandle = null; } }
  loop(key, name, o = {}) {
    if (this.loops[key]) return this.loops[key];
    if (!this.has(name)) return null;
    const h = this.sfx.loop(name, o);
    this.loops[key] = h;
    return h;
  }
  stopLoop(key, fade = 0.2) { const h = this.loops[key]; if (h) { h.stop(fade); delete this.loops[key]; } }
  setLoop(key, vol, fade = 0.15) { const h = this.loops[key]; if (h) h.setVolume(vol, fade); }
  stopAll() { for (const k of Object.keys(this.loops)) this.stopLoop(k, 0.3); this.stopVoice(); }
  toggleMute() { this.muted = !this.muted; this.sfx.setVolume("master", this.muted ? 0 : 1); return this.muted; }
}
