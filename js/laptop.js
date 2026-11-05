// The laptop: MeTube, Block Dodge, Chat, and the fake essay
const W = 256, H = 160;
const rand = (a, b) => a + Math.random() * (b - a);

export class Laptop {
  constructor(canvas, audio) {
    this.c = canvas; this.g = canvas.getContext("2d"); this.g.imageSmoothingEnabled = false;
    this.audio = audio;
    this.reset({});
  }
  reset(day) {
    this.day = day;
    this.app = "tube"; this.essay = false; this.sound = false;
    this.vidIdx = 0; this.vidT = 0; this.buffering = 0;
    this.chat = [{ from: "Sam", text: day.samFirst || "yo r u gonna pay attention today lol" }];
    this.unread = 1; this.replyIdx = 0; this.samQueue = (day.sam || []).slice(); this.samTimer = rand(18, 28);
    this.game = { x: 128, items: [], t: 0, score: 0, spawn: 0 };
    this.essayLines = (day.essay || []).slice(); this.essayShown = 0; this.essayTimer = 0;
    this.override = null; // {draw:fn, t}
    this.live = false;
    this.keysDown = {};
  }
  videos() { return this.day.videos || []; }
  get video() { const v = this.videos(); return v[this.vidIdx % Math.max(1, v.length)] || { title: "", kind: "cat" }; }

  key(code, down) {
    this.keysDown[code] = down;
    if (!down) return null;
    if (code === "Digit1") { this.app = "tube"; return "switch"; }
    if (code === "Digit2") { this.app = "game"; return "switch"; }
    if (code === "Digit3") { this.app = "chat"; this.unread = 0; return "switch"; }
    if (code === "KeyV") { this.sound = !this.sound; return "switch"; }
    if (code === "Enter" && this.app === "chat" && !this.essay) return this.reply();
    if ((code === "KeyN" || code === "ArrowRight") && this.app === "tube" && !this.essay) { this.nextVideo(); return "switch"; }
    return null;
  }
  nextVideo() { this.vidIdx++; this.vidT = 0; this.buffering = 0.6; }
  reply() {
    const replies = this.day.replies || ["lol", "fr", "shhh she's looking", "ok ok", "bruh", "lmaooo"];
    this.chat.push({ from: "You", text: replies[this.replyIdx++ % replies.length] });
    this.audio.play("key", { vary: 0.2 });
    return "reply";
  }

  // returns {fun, drain, noise, live}
  update(dt, active) {
    const out = { fun: 0, drain: 0, noise: 0, notify: false, burst: 0, drainBurst: 0 };
    // incoming chat (arrives even while closed)
    this.samTimer -= dt;
    if (this.samTimer <= 0 && this.samQueue.length) {
      this.chat.push({ from: this.day.samName || "Sam", text: this.samQueue.shift() });
      if (this.app !== "chat" || !active) this.unread++;
      this.samTimer = rand(20, 34);
      out.notify = true;
    }
    if (this.override) { this.override.t -= dt; if (this.override.t <= 0) this.override = null; }
    if (this.essay && active) {
      this.essayTimer += dt;
      if (this.essayTimer > 2.5 && this.essayShown < this.essayLines.length) { this.essayTimer = 0; this.essayShown++; }
    }
    this.live = active && !this.essay && this.app === "tube" && this.video.kind === "live" && this.buffering <= 0 && !this.override;
    if (!active || this.essay) return out;
    if (this.app === "tube") {
      if (this.buffering > 0) this.buffering -= dt;
      else {
        this.vidT += dt;
        if (this.vidT > (this.video.len || 24)) this.nextVideo();
        const loud = this.sound ? 1.6 : 1;
        out.fun = 3.2 * loud; out.drain = 5.5 * loud; out.noise = this.sound ? 0.55 : 0;
      }
    } else if (this.app === "game") {
      const gm = this.game;
      const L = this.keysDown.KeyA || this.keysDown.ArrowLeft, R = this.keysDown.KeyD || this.keysDown.ArrowRight;
      gm.x = Math.max(12, Math.min(W - 12, gm.x + ((R ? 1 : 0) - (L ? 1 : 0)) * 150 * dt));
      gm.spawn -= dt; gm.t += dt;
      if (gm.spawn <= 0) { gm.spawn = rand(0.35, 0.7); gm.items.push({ x: rand(10, W - 10), y: 24, v: rand(50, 90) + gm.t * 0.6, coin: Math.random() < 0.4 }); }
      for (const it of gm.items) it.y += it.v * dt;
      for (const it of gm.items) {
        if (!it.dead && it.y > H - 22 && it.y < H - 8 && Math.abs(it.x - gm.x) < 14) {
          it.dead = true;
          if (it.coin) { gm.score++; out.burst += 6; out.drainBurst += 10; this.audio.play("game_coin", { volume: this.sound ? 1 : 0.35, vary: 0.1 }); }
          else { gm.score = Math.max(0, gm.score - 1); out.burst -= 3; this.audio.play("game_hit", { volume: this.sound ? 1 : 0.35 }); if (this.sound) out.noise += 8; }
        }
      }
      gm.items = gm.items.filter((i) => !i.dead && i.y < H + 10);
      out.fun += 1.4; out.drain += 6.5; out.noise += this.sound ? 0.3 : 0;
    } else if (this.app === "chat") {
      out.fun = 0.6; out.drain = 2;
    }
    return out;
  }

  draw(t) {
    const g = this.g;
    if (this.override) { this.override.draw(g, W, H, t); return; }
    if (this.essay) return this.drawEssay(g, t);
    // window chrome
    g.fillStyle = "#1c1c22"; g.fillRect(0, 0, W, H);
    const tabs = [["tube", "1 MeTube"], ["game", "2 Games"], ["chat", "3 Chat" + (this.unread ? ` (${this.unread})` : "")]];
    tabs.forEach(([id, label], i) => {
      g.fillStyle = this.app === id ? "#3a3a46" : "#26262e"; g.fillRect(2 + i * 72, 2, 70, 13);
      g.fillStyle = id === "chat" && this.unread ? "#7cf" : "#ddd"; g.font = "bold 9px monospace"; g.fillText(label, 6 + i * 72, 12);
    });
    g.fillStyle = this.sound ? "#6f6" : "#f66"; g.font = "bold 9px monospace"; g.fillText(this.sound ? "SND ON" : "MUTED", W - 40, 12);
    if (this.app === "tube") this.drawTube(g, t);
    else if (this.app === "game") this.drawGame(g, t);
    else this.drawChat(g, t);
  }

  drawTube(g, t) {
    const v = this.video;
    g.fillStyle = "#000"; g.fillRect(4, 18, W - 8, 108);
    if (this.buffering > 0) {
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, 72, 10, t * 6, t * 6 + 4); g.stroke();
    } else if (v.kind === "live") {
      // live feed is shown via render-target (see main); draw only overlay
      g.clearRect(4, 18, W - 8, 108);
    } else this.drawVideo(g, v, this.vidT, t);
    // title + progress
    g.fillStyle = "#1c1c22"; g.fillRect(0, 126, W, 34);
    g.fillStyle = "#f33"; g.fillRect(4, 128, (W - 8) * Math.min(1, this.vidT / (v.len || 24)), 3);
    g.fillStyle = "#eee"; g.font = "bold 9px monospace"; g.fillText(v.title.slice(0, 40), 4, 142);
    g.fillStyle = "#999"; g.font = "8px monospace"; g.fillText((v.views || "2.1M views") + "   [N] next  [V] sound", 4, 154);
    if (v.kind === "live") { g.fillStyle = "#e00"; g.fillRect(8, 22, 26, 10); g.fillStyle = "#fff"; g.font = "bold 8px monospace"; g.fillText("LIVE", 11, 30); }
  }
  drawVideo(g, v, vt, t) {
    const x0 = 4, y0 = 18, w = W - 8, h = 108;
    if (v.kind === "cat") {
      g.fillStyle = "#7ac"; g.fillRect(x0, y0, w, h); g.fillStyle = "#8b6"; g.fillRect(x0, y0 + 80, w, 28);
      const bx = x0 + 40 + ((vt * 60) % (w - 60)), by = y0 + 70 - Math.abs(Math.sin(vt * 4)) * 40;
      g.fillStyle = "#e93"; g.fillRect(bx, by, 24, 16); g.fillRect(bx + 2, by - 5, 5, 5); g.fillRect(bx + 17, by - 5, 5, 5);
      g.fillStyle = "#000"; g.fillRect(bx + 5, by + 5, 3, 3); g.fillRect(bx + 15, by + 5, 3, 3);
      if (Math.sin(vt * 2) > 0.7) { g.fillStyle = "#fff"; g.font = "bold 14px monospace"; g.fillText("BONK", bx - 10, by - 10); }
    } else if (v.kind === "blocks") {
      for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) { g.fillStyle = ((i + j + Math.floor(vt * 2)) % 3) ? "#5a3" : "#964"; g.fillRect(x0 + i * 21, y0 + 40 + j * 10, 21, 10); }
      g.fillStyle = "#9cf"; g.fillRect(x0, y0, w, 40);
      g.fillStyle = "#3af"; g.fillRect(x0 + 100 + Math.sin(vt) * 40, y0 + 20, 12, 20);
      g.fillStyle = "#fff"; g.font = "bold 10px monospace"; g.fillText("SOUP BLOCK??", x0 + 70, y0 + 14);
    } else if (v.kind === "rain") {
      g.fillStyle = "#223"; g.fillRect(x0, y0, w, h); g.fillStyle = "#88a";
      for (let i = 0; i < 40; i++) { const rx = (i * 37 + vt * 20) % w, ry = (i * 53 + vt * 140) % h; g.fillRect(x0 + rx, y0 + ry, 1, 5); }
    } else if (v.kind === "face") {
      // a video of someone who looks like her, too close
      g.fillStyle = "#111"; g.fillRect(x0, y0, w, h);
      const z = 1 + vt * 0.05; const fw = 60 * z, fh = 70 * z;
      g.fillStyle = "#c8b8a8"; g.fillRect(W / 2 - fw / 2, y0 + 54 - fh / 2, fw, fh);
      g.fillStyle = "#000"; g.fillRect(W / 2 - fw * 0.3, y0 + 45 - fh * 0.1, fw * 0.18, fh * 0.12); g.fillRect(W / 2 + fw * 0.12, y0 + 45 - fh * 0.1, fw * 0.18, fh * 0.12);
      g.fillRect(W / 2 - fw * 0.2, y0 + 70, fw * 0.4, 4);
      g.fillStyle = "#fff"; g.font = "bold 9px monospace"; g.fillText("pay attention pay attention", x0 + 40, y0 + h - 6);
    } else if (v.kind === "static") {
      for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < 0.5 ? "#000" : "#ccc"; g.fillRect(x0 + Math.random() * w, y0 + Math.random() * h, 3, 2); }
      g.fillStyle = "#fff"; g.font = "bold 10px monospace"; g.fillText("ROOM 113 - ARCHIVE 1987", x0 + 50, y0 + 56);
    } else if (v.kind === "speed") {
      g.fillStyle = "#222"; g.fillRect(x0, y0, w, h);
      for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#ff0" : "#f0f"; g.fillRect(x0 + ((i * 40 - vt * 200) % (w + 40) + w + 40) % (w + 40) - 20, y0 + 50, 20, 10); }
      g.fillStyle = "#fff"; g.font = "bold 12px monospace"; g.fillText("ANY% WORLD RECORD", x0 + 60, y0 + 30);
    }
  }
  drawGame(g, t) {
    const gm = this.game;
    g.fillStyle = "#101830"; g.fillRect(4, 18, W - 8, H - 22);
    g.fillStyle = "#fff"; g.font = "bold 9px monospace"; g.fillText("BLOCK DODGE  score " + gm.score + "   [A/D]", 8, 30);
    for (const it of gm.items) { g.fillStyle = it.coin ? "#fd3" : "#e33"; if (it.coin) { g.beginPath(); g.arc(it.x, it.y, 5, 0, 7); g.fill(); } else g.fillRect(it.x - 6, it.y - 6, 12, 12); }
    g.fillStyle = "#4df"; g.fillRect(gm.x - 12, H - 16, 24, 8);
  }
  drawChat(g, t) {
    g.fillStyle = "#16161c"; g.fillRect(4, 18, W - 8, H - 22);
    const msgs = this.chat.slice(-7);
    msgs.forEach((m, i) => {
      const y = 32 + i * 17, you = m.from === "You";
      g.fillStyle = you ? "#2a5aa8" : m.wrong ? "#5a1010" : "#333340";
      const tw = Math.min(200, 10 + m.text.length * 5.4);
      g.fillRect(you ? W - 8 - tw : 8, y - 10, tw, 14);
      g.fillStyle = "#eee"; g.font = "9px monospace"; g.fillText(m.text.slice(0, 36), you ? W - 4 - tw : 12, y);
    });
    g.fillStyle = "#888"; g.font = "8px monospace"; g.fillText("[ENTER] reply", 8, H - 6);
  }
  drawEssay(g, t) {
    g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#4a7ae8"; g.fillRect(0, 0, W, 14); g.fillStyle = "#fff"; g.font = "bold 9px monospace"; g.fillText("Docs - Photosynthesis Essay", 4, 10);
    g.fillStyle = "#fff"; g.fillRect(24, 18, W - 48, H - 18);
    g.fillStyle = "#222"; g.font = "bold 9px monospace"; g.fillText("Photosynthesis", 32, 32);
    g.font = "8px monospace";
    const base = ["Photosynthesis is the process by", "which plants use sunlight, water", "and carbon dioxide to create", "glucose and oxygen. It happens", "in the chloroplasts."];
    base.forEach((l, i) => g.fillText(l, 32, 46 + i * 11));
    for (let i = 0; i < this.essayShown; i++) { g.fillStyle = "#900"; g.fillText(this.essayLines[i], 32, 46 + (base.length + i) * 11); }
    if (Math.floor(t * 2) % 2) { g.fillStyle = "#222"; g.fillRect(32 + 2, 46 + (base.length + this.essayShown) * 11 - 8, 1, 9); }
  }
  showReflection(dur = 1.4) {
    this.override = { t: dur, draw: (g, w, h, t) => {
      g.fillStyle = "#020202"; g.fillRect(0, 0, w, h);
      // your dim reflection
      g.fillStyle = "#101010"; g.fillRect(w / 2 - 22, 70, 44, 50); g.fillRect(w / 2 - 40, 115, 80, 45);
      // her face over your shoulder
      g.fillStyle = "#5a4c40"; g.fillRect(w / 2 + 30, 26, 50, 60);
      g.fillStyle = "#000"; g.fillRect(w / 2 + 38, 44, 12, 10); g.fillRect(w / 2 + 60, 44, 12, 10);
      g.fillStyle = "#300"; g.fillRect(w / 2 + 40, 70, 30, 6);
    } };
  }
  showBlackText(text, dur = 2) {
    this.override = { t: dur, draw: (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#c00"; g.font = "bold 14px monospace"; const tw = g.measureText(text).width; g.fillText(text, (w - tw) / 2, h / 2); } };
  }
}
