// EYES UP FRONT - main game loop
import * as THREE from "three";
import { PSXRenderer, lit } from "./psx.js";
import { Classroom, PLAYER_POS, CLASSMATES, drawFace } from "./world.js";
import { Teacher } from "./teacher.js";
import { Laptop } from "./laptop.js";
import { Audio } from "./audio.js";
import { DAYS, LINE_TEXT, SLIPS } from "./days.js";

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- setup
const psx = new PSXRenderer($("game"));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 10, 26);
const camera = new THREE.PerspectiveCamera(68, psx.aspect, 0.05, 60);
camera.position.copy(PLAYER_POS);
camera.rotation.order = "YXZ";
psx.onResize = (a) => { camera.aspect = a; camera.updateProjectionMatrix(); };
psx.resize();

const audio = new Audio();
const room = new Classroom(scene);
const teacher = new Teacher(scene, audio);
const laptop = new Laptop(room.screenCanvas, audio);

// ghost teacher + your own body: only visible to the livestream camera (layer 1)
const ghost = new Teacher(scene, audio);
ghost.hideCone = true; ghost.cone.visible = false;
ghost.group.traverse((o) => o.layers.set(1));
ghost.group.visible = false;
const me = room.makeStudent({ name: "You", c: 2, r: 2, skin: "#e0b896", hair: "#2a1a10", shirt: "#556070" });
room.mutables.splice(room.mutables.indexOf(me), 1); room.students.pop();
me.obj.traverse((o) => o.layers.set(1));
const feedCam = new THREE.PerspectiveCamera(60, 248 / 108, 0.05, 40);
feedCam.layers.enable(1);
feedCam.position.set(PLAYER_POS.x + 0.4, 2.3, PLAYER_POS.z + 2.7);
feedCam.lookAt(PLAYER_POS.x, 0.9, PLAYER_POS.z - 1.5);
const feedRT = new THREE.WebGLRenderTarget(124, 54, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const feedPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.43 * 248 / 256, 0.27 * 108 / 160), new THREE.MeshBasicMaterial({ map: feedRT.texture }));
feedPlane.position.set(0, 0.15 + 0.27 * (80 - 72) / 160, 0.001);
room.lid.add(feedPlane); feedPlane.visible = false;

const frustum = new THREE.Frustum(), projM = new THREE.Matrix4();

// ---------- state
let S = null;               // per-day state
let mode = "title";         // title | card | play | paused | scare
let unlocked = 1;
try { unlocked = clamp(parseInt(localStorage.getItem("euf_unlocked") || "1", 10), 1, 5); } catch (e) {}
let selectedDay = unlocked - 1;
let endingsSeen = {};
try { endingsSeen = JSON.parse(localStorage.getItem("euf_endings") || "{}"); } catch (e) {}

const view = { yaw: 0, pitch: -0.05, mode: "up", glance: false, laptopT: 0, lockT: 0 };
const keys = {};

// ---------- title / cards
function buildDaySelect() {
  const el = $("daySelect"); el.innerHTML = "";
  DAYS.forEach((d, i) => {
    const b = document.createElement("button");
    b.textContent = d.name.slice(0, 3);
    b.disabled = i >= unlocked;
    if (i === selectedDay) b.className = "sel";
    b.onclick = (e) => { e.stopPropagation(); selectedDay = i; buildDaySelect(); audio.play("switch"); };
    el.appendChild(b);
  });
}
let loaded = false, startQueued = false;
$("title").addEventListener("click", () => {
  if (!loaded) { startQueued = true; return; }
  startDayCard(selectedDay);
});
function showCard(html, onClick) {
  mode = "card";
  $("cardInner").innerHTML = html + `<p class="small">click to continue</p>`;
  $("card").classList.remove("hidden");
  $("hud").classList.add("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
  const h = () => { $("card").removeEventListener("click", h); $("card").classList.add("hidden"); onClick(); };
  setTimeout(() => $("card").addEventListener("click", h), 400);
}
function startDayCard(i) {
  $("title").classList.add("hidden");
  audio.stopLoop("lofi", 1);
  const d = DAYS[i];
  showCard(`<h2>${d.name}</h2><p>${d.intro}</p>`, () => startDay(i));
}

// ---------- day setup
function startDay(i) {
  const cfg = DAYS[i];
  S = {
    i, cfg, t: 0, fun: 0, urge: 15, strikes: 0, events: cfg.events.map((e) => ({ ...e })), lineIdx: 0,
    nextLine: rand(8, 14), lightsOut: false, flicker: 0, clockBack: 0, clockMin: 60, forced: 0,
    laptopTime: 0, stalk: false, behind: null, finale: false, sub: null, seq: null, over: false, essayLock: 0,
  };
  // world
  room.resetMutables();
  room.setPresent(cfg.present);
  room.setMannequins(!!cfg.mannequins);
  room.setPhotos(cfg.photos.map((n) => CLASSMATES.find((c) => c.name === n)).filter(Boolean));
  room.setWindows(cfg.windows);
  room.setLights(cfg.lights);
  room.setBoard(cfg.board, cfg.boardCreepy);
  room.redLight.intensity = cfg.red ? 2.2 * cfg.red : 0;
  scene.fog.near = lerp(12, 3, i / 4); scene.fog.far = lerp(28, 13, i / 4);
  teacher.reset(cfg);
  teacher.onStep = () => stepSound(teacher);
  teacher.onEvent = (e) => teacherEvent(e);
  ghost.reset({ face: "wrong", tall: cfg.tall, neck: cfg.neck }); ghost.cone.visible = false; ghost.group.visible = false;
  laptop.reset(cfg);
  view.mode = "up"; view.glance = false; view.laptopT = 0; view.yaw = 0; view.pitch = -0.05; view.lockT = 0;
  room.setLid(0.25); room.setBook(0); S.bookTarget = 0;
  psx.uniforms.uGrain.value = cfg.grain; psx.uniforms.uVig.value = cfg.vig; psx.uniforms.uRed.value = 0; psx.uniforms.uFade.value = 1;
  // audio
  audio.stopAll();
  audio.loop("hum", "hum", { volume: 1 });
  audio.loop("tick", "tick", { volume: 1 });
  if (cfg.ambience) audio.loop("amb", "ambience", { volume: i === 2 ? 0.5 : 1 });
  if (cfg.drone) audio.loop("drone", "drone", { volume: cfg.drone });
  audio.loop("chalk", "chalk", { volume: 0 });
  audio.loop("heart", "heartbeat", { volume: 0 });
  audio.loop("video", "video", { volume: 0 });
  audio.loop("static", "static", { volume: 0 });
  // hud
  $("dayLabel").textContent = cfg.name;
  $("funQuota").style.left = "100%";
  $("funBar").parentElement.parentElement.style.display = cfg.quota ? "" : "none";
  $("hint").textContent = ""; $("subtitle").textContent = ""; S.subUntil = 0;
  $("card").classList.add("hidden"); $("title").classList.add("hidden"); $("quiz").classList.add("hidden"); $("slip").classList.add("hidden");
  $("hud").classList.remove("hidden");
  mode = "play";
  $("game").requestPointerLock && $("game").requestPointerLock();
}

// ---------- speech
function say(line, opts = {}) {
  const rate = S && S.cfg.voiceRate || 1;
  const dur = audio.voice(line, { rate, volume: opts.volume ?? 1 }) || 3;
  const el = $("subtitle");
  el.textContent = LINE_TEXT[line] || "";
  el.className = S && S.i >= 3 ? "wrong" : "";
  if (S) S.subUntil = S.t + dur + 0.6;
  return dur;
}
function hint(text) { $("hint").textContent = text; }

function teacherEvent(e) {
  if (!S) return;
  if (e === "faced" && S.t > S.nextLine) { S.nextLine = S.t + rand(12, 20); say(S.cfg.lines[S.lineIdx++ % S.cfg.lines.length]); }
  if (e === "suspicious") say("hm");
  if (e === "swivel") { audio.play("creak", { volume: 0.5, rate: 0.6 }); }
  if (e === "stareDone") {
    // lights stutter and she's back at the board, teaching like nothing happened
    S.flicker = 0.45; audio.play("flicker", { volume: 0.7 });
    restStalk();
  }
}

function stepSound(t) {
  const d = t.distToPlayer();
  const v = clamp(1.3 - d / 9, 0.08, 1.2) * (S && S.stalk ? 1.2 : 1);
  audio.play("step", { volume: v, vary: 0.08, pan: panFor(t.pos), rate: S && S.i >= 4 ? 0.85 : 1, cooldown: 0.1 });
}
function panFor(p) {
  const v = new THREE.Vector3(p.x - camera.position.x, 0, p.z - camera.position.z).normalize();
  const right = new THREE.Vector3(Math.cos(view.yaw), 0, -Math.sin(view.yaw));
  return clamp(v.dot(right), -1, 1) * 0.8;
}

// ---------- input
addEventListener("keydown", (e) => {
  if (e.code === "Tab") e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === "KeyM") { audio.toggleMute(); return; }
  if (mode === "play" && e.code === "KeyP") { pause(true); return; }
  if (mode === "paused" && (e.code === "KeyP" || e.code === "Escape")) { pause(false); return; }
  if (mode !== "play" || view.lockT > 0) return;
  if (e.code === "Space") toggleLaptop();
  else if (e.code === "KeyB") { S.bookTarget = S.bookTarget ? 0 : 1; audio.play(S.bookTarget ? "book_open" : "book_close"); }
  else if (view.mode === "laptop") {
    const r = laptop.key(e.code, true);
    if (r === "switch") audio.play("switch", { volume: 0.6 });
    if (r === "reply") { S.urge = Math.max(0, S.urge - 12); S.fun += 4; }
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") view.glance = true;
});
addEventListener("keyup", (e) => {
  keys[e.code] = false;
  laptop.key(e.code, false);
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") view.glance = false;
});
$("game").addEventListener("click", () => { if (mode === "play" && !document.pointerLockElement) $("game").requestPointerLock(); });
addEventListener("mousemove", (e) => {
  if (mode !== "play" || view.mode !== "up" || view.lockT > 0 || !document.pointerLockElement) return;
  view.yaw -= e.movementX * 0.0025;
  view.pitch -= e.movementY * 0.0025;
  view.yaw = clamp(view.yaw, -2.9, 2.9);
  view.pitch = clamp(view.pitch, -1.0, 0.7);
});
function pause(on) {
  if (on) { mode = "paused"; $("subtitle").textContent = "PAUSED - press P"; document.exitPointerLock && document.exitPointerLock(); audio.sfx.ctx.suspend(); }
  else { mode = "play"; $("subtitle").textContent = ""; audio.sfx.ctx.resume(); $("game").requestPointerLock && $("game").requestPointerLock(); }
}
function toggleLaptop(force) {
  if (view.mode === "up" || force === true) {
    view.mode = "laptop"; audio.play("key", { rate: 0.7 }); S.preYaw = view.yaw; S.prePitch = view.pitch;
    // she hears the lid if she's close
    if (teacher.group.visible && teacher.distToPlayer() < 5) teacher.sus = Math.min(100, teacher.sus + 18);
  } else {
    view.mode = "up"; laptop.essay = false; audio.play("book_close", { volume: 0.4, rate: 1.4 });
    view.yaw = 0; view.pitch = -0.08;
  }
}

// ---------- scares
const scareCanvas = $("scare"), scareG = scareCanvas.getContext("2d");
function drawScareFace() {
  const g = scareG;
  g.fillStyle = "#000"; g.fillRect(0, 0, 160, 120);
  g.save(); g.translate(80 + rand(-5, 5), 62 + rand(-4, 4)); g.scale(1 + rand(0, 0.1), 1 + rand(0, 0.12)); g.rotate(rand(-0.06, 0.06));
  // long pale face
  g.fillStyle = "#b9ab9c"; g.beginPath(); g.ellipse(0, 4, 40, 62, 0, 0, 7); g.fill();
  g.fillStyle = "#8a7c70"; g.fillRect(-40, 10, 8, 40); g.fillRect(32, 10, 8, 40);
  // grey hair falling over the sides
  g.fillStyle = "#2a2a2e"; for (let i = 0; i < 14; i++) g.fillRect(-46 + i * 7 + rand(-1, 1), -60, 5, rand(30, 75) * (i < 4 || i > 9 ? 1.4 : 0.5));
  // deep sunken eyes
  g.fillStyle = "#000";
  for (const x of [-17, 17]) { g.beginPath(); g.ellipse(x, -8, 11, 15, x < 0 ? 0.25 : -0.25, 0, 7); g.fill(); }
  g.fillStyle = "#f22"; for (const x of [-17, 17]) g.fillRect(x - 1 + rand(-1, 1), -6, 2, 2);
  // stretched mouth
  g.fillStyle = "#0a0000"; g.beginPath(); g.moveTo(-14, 26); g.lineTo(14, 26); g.lineTo(9, 60); g.lineTo(-9, 60); g.closePath(); g.fill();
  g.fillStyle = "#ddd"; for (let i = 0; i < 6; i++) { g.fillRect(-13 + i * 4.6, 26, 3, 5); g.fillRect(-8 + i * 3, 55, 2, 4); }
  g.fillStyle = "#600"; for (const x of [-17, 17]) g.fillRect(x - 1, 6, 2, rand(20, 40));
  g.restore();
  g.fillStyle = "rgba(160,0,0,0.25)"; g.fillRect(0, 0, 160, 120);
  for (let i = 0; i < 300; i++) { scareG.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`; scareG.fillRect(Math.random() * 160, Math.random() * 120, 2, 1); }
}
function jumpscare({ strike = false, line = null, behind = false, level = null } = {}) {
  mode = "scare";
  audio.stopVoice();
  view.mode = "up"; laptop.essay = false;
  const lvl = level ?? (S.cfg.scareLevel || 3);
  const yaw = behind ? Math.PI : 0;
  view.yaw = yaw; view.pitch = lvl === 1 ? 0.12 : 0; applyView(1);
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  teacher.visible(true); teacher.hideCone = true; teacher.cone.visible = false;
  const headH = (0.92 + 0.52 + 0.1 * (S.cfg.neck || 1) + 0.13) * (S.cfg.tall || 1);
  if (lvl === 1) {
    // Wednesday: unsettling, not a full scare. She's simply standing right there, smiling.
    const p = PLAYER_POS.clone().addScaledVector(fwd, 1.15);
    teacher.pos.set(p.x, 0, p.z);
    teacher.yaw = Math.atan2(-fwd.x, -fwd.z); teacher.headYaw = 0; teacher.turnLead = 0; teacher.lean = 0.35;
    teacher.setFace("smile");
    teacher.arms.forEach((a) => { a.rotation.set(0.05, 0, 0); a.userData.elbow.rotation.x = -0.2; }); teacher.updateCone({});
    teacher.headPivot.rotation.z = 0.35; // head tilt
    audio.play("thump", { volume: 0.7, cooldown: 0 });
    audio.play("whisper", { volume: 0.5, cooldown: 0 });
    if (line) setTimeout(() => say(line), 300);
    psx.uniforms.uShake.value = 0.12; setTimeout(() => (psx.uniforms.uShake.value = 0), 250);
    S.seq = { t: 0, dur: 1.8, kind: "scare", strike };
    return;
  }
  // put her right in your face
  const p = PLAYER_POS.clone().addScaledVector(fwd, 0.55);
  teacher.pos.set(p.x, PLAYER_POS.y - headH, p.z);
  teacher.yaw = Math.atan2(-fwd.x, -fwd.z); teacher.headYaw = 0; teacher.turnLead = 0;
  teacher.setFace("monster"); teacher.lean = 0.25;
  teacher.arms.forEach((a) => { a.rotation.set(-1.1, 0, 0); a.userData.elbow.rotation.x = -0.3; }); teacher.updateCone({});
  room.redLight.intensity = 2; room.redLight.position.set(PLAYER_POS.x, 1.6, PLAYER_POS.z - 0.2);
  audio.play(Math.random() < 0.5 ? "scare1" : "scare2", { vary: 0, cooldown: 0 });
  audio.play("scream", { vary: 0.05, cooldown: 0 });
  audio.play("clang", { cooldown: 0 });
  if (line) setTimeout(() => say(line), 350);
  psx.uniforms.uShake.value = 1;
  $("flash").classList.remove("hidden"); setTimeout(() => $("flash").classList.add("hidden"), 70);
  let frames = 0;
  const flick = setInterval(() => {
    frames++;
    if (Math.random() < 0.35) { drawScareFace(); scareCanvas.classList.remove("hidden"); } else scareCanvas.classList.add("hidden");
    if (frames > 12) { clearInterval(flick); scareCanvas.classList.add("hidden"); }
  }, 70);
  S.seq = { t: 0, dur: 1.25, kind: "scare", strike };
}
function endScare() {
  const seq = S.seq; S.seq = null;
  psx.uniforms.uShake.value = 0;
  room.redLight.position.set(0, 2.8, -7); room.redLight.intensity = S.cfg.red ? 2.2 * S.cfg.red : 0;
  teacher.pos.y = 0; teacher.lean = 0; teacher.hideCone = false; teacher.setFace(S.cfg.face);
  teacher.sus = 0; teacher.goToBoardNow(); teacher.visible(true);
  teacher.reached = false;
  if (S.stalk) restStalk();
  mode = "play";
  if (seq.strike) addStrike();
}
function restStalk() {
  teacher.stalking = false; teacher.reached = false; teacher.seenT = 0; teacher.path = [];
  teacher.goToBoardNow();
  const r = S.cfg.stalkRest || [8, 12];
  S.stalkRest = rand(r[0], r[1]) * (S.finale ? 0.5 : 1);
}
function addStrike() {
  S.strikes++;
  if (S.strikes >= 3) return failDay("caught");
}

function caught() {
  if (S.over) return;
  laptop.sound = false;
  if (S.cfg.jumpscareOnCatch) { jumpscare({ strike: true, line: S.i >= 3 ? "found" : "c3" }); return; }
  // early days: a detention slip
  mode = "scare";
  say(Math.random() < 0.5 ? "c1" : "c2");
  teacher.setFace("smile");
  $("slipText").textContent = SLIPS[S.strikes % SLIPS.length];
  $("slip").classList.remove("hidden");
  audio.play("thump");
  view.mode = "up"; view.yaw = 0; view.pitch = -0.05; laptop.essay = false;
  S.seq = { t: 0, dur: 2.6, kind: "slip" };
}
function endSlip() {
  S.seq = null; $("slip").classList.add("hidden");
  teacher.setFace(S.cfg.face); teacher.sus = 0;
  if (teacher.state === "investigate") { teacher.state = "return"; teacher.pathToBoard(); }
  mode = "play";
  addStrike();
}

// ---------- day script effects
function runFx(fx) {
  const cfg = S.cfg;
  switch (fx) {
    case "locker": audio.play("locker", { pan: 0.9 }); setTimeout(() => audio.play("door", { pan: 0.9, volume: 0.6 }), 900); break;
    case "repeat": break;
    case "clockBack": S.clockBack = 8; break;
    case "rollSound": audio.play("chair_roll", { pan: -0.4, volume: 0.6 }); { const r = room.rollers[0]; r.obj.position.set(4.4, 0, 5.2); } break;
    case "flicker": S.flicker = 2.5; audio.play("flicker"); break;
    case "whisper": audio.play("whisper", { pan: -0.7 }); break;
    case "doorCreak": audio.play("door_creak", { pan: 0.9 }); room.door.rotation.y = 0.5; break;
    case "reflection":
      // only fires if you're on the laptop; otherwise retry a bit later
      if (view.mode === "laptop" && !laptop.essay) {
        laptop.buffering = 0; laptop.showReflection(1.3);
        audio.play("glitch"); setTimeout(() => { audio.play("whisper", { volume: 0.7 }); audio.play("thump", { volume: 0.4 }); }, 150);
        teacher.goToBoardNow();
      } else S.events.push({ t: S.t / cfg.dur + 0.04, fx: "reflection" });
      break;
    case "lightsOutDesk": startLightsOutDesk(); break;
    case "stalk": S.stalk = true; teacher.stalking = true; teacher.path = []; teacher.reached = false; teacher.seenT = 0; if (S.i === 3) hint("She only moves when you aren't looking at her."); setTimeout(() => S && hint(""), 5000); break;
    case "ghostFeed":
      ghost.group.visible = true; ghost.placeAt(PLAYER_POS.x + 0.25, PLAYER_POS.z + 0.75, Math.PI); ghost.setFace("wrong"); ghost.headYaw = 0.3; ghost.updateCone({});
      S.ghostT = 14; audio.play("breath", { volume: 0.4 });
      break;
    case "behind": startBehind(); break;
    case "finale":
      S.finale = true; audio.play("lights_off"); room.setLights(0.06); room.redLight.intensity = 3.2;
      teacher.cfg = { ...teacher.cfg, stalkSpeed: 1.45 }; audio.loop("tension", "drone", { volume: 0.8, rate: 0.7 });
      say("d5_4");
      break;
  }
}

function startLightsOutDesk() {
  // Lights die. When they come back she is at your desk.
  S.seq = { kind: "lightsOut", t: 0, dur: 6.2, stage: 0 };
  mode = "scare"; view.lockT = 6.2;
  audio.play("lights_off"); room.setLights(0); S.lightsOut = true; teacher.visible(false);
  audio.setLoop("hum", 0, 0.05); audio.setLoop("chalk", 0, 0.05);
}
function updateLightsOut(dt) {
  const q = S.seq; q.t += dt;
  if (q.stage === 0 && q.t > 2.2) {
    q.stage = 1;
    view.mode = "up"; view.yaw = 0; view.pitch = -0.12; laptop.essay = false;
    teacher.placeAt(PLAYER_POS.x, PLAYER_POS.z - 1.2, 0); teacher.lean = 0.75; teacher.setFace("grin"); view.pitch = 0.2;
    teacher.arms.forEach((a) => { a.rotation.set(-0.7, 0, 0); a.userData.elbow.rotation.x = -0.5; }); teacher.updateCone({}); teacher.visible(true); teacher.hideCone = true; teacher.cone.visible = false;
    room.setLights(S.cfg.lights); S.lightsOut = false; audio.setLoop("hum", 1);
    audio.play("scare1", { cooldown: 0 }); audio.play("clang", { cooldown: 0 });
    psx.uniforms.uShake.value = 0.6; setTimeout(() => (psx.uniforms.uShake.value = 0), 500);
    setTimeout(() => say("d4_1"), 600);
  }
  if (q.stage === 1 && q.t > 4.6) { q.stage = 2; audio.play("lights_off", { volume: 0.6 }); room.setLights(0); S.lightsOut = true; teacher.visible(false); }
  if (q.stage === 2 && q.t > 5.4) {
    q.stage = 3; teacher.lean = 0; room.setLights(S.cfg.lights); S.lightsOut = false; teacher.hideCone = false; teacher.setFace(S.cfg.face); teacher.goToBoardNow(); teacher.visible(true);
    $("quiz").classList.remove("hidden"); audio.play("book_open"); setTimeout(() => $("quiz").classList.add("hidden"), 2600);
  }
  if (q.t >= q.dur) { S.seq = null; mode = "play"; }
}

function startBehind() {
  // she leaves the board; footsteps and breathing come from behind you
  S.behind = { t: 0, armed: true };
  teacher.visible(false); teacher.stalking = false;
  audio.play("heels", { pan: 0, volume: 0.9 });
  setTimeout(() => audio.play("breath", { volume: 0.9 }), 2200);
}
function updateBehind(dt) {
  const b = S.behind; b.t += dt;
  const turned = Math.abs(view.yaw) > 2.2 && view.mode === "up";
  if (b.t > 1.5 && turned) {
    S.behind = null;
    jumpscare({ behind: true, line: "found" });
    restStalk(); return;
  }
  if (b.t > 6) {
    S.behind = null; say("d5_5"); teacher.visible(true); restStalk();
  }
}

// ---------- room creep: things move when you're not looking
function isVisible(pos) {
  return frustum.containsPoint(pos) && !(view.mode === "laptop" && !view.glance) && !S.lightsOut;
}
function creep() {
  const kinds = S.cfg.creepKinds || [];
  const cand = room.mutables.filter((m) => kinds.includes(m.kind === "head" ? "head" : m.kind) && (m.kind !== "head" || m.obj.visible));
  if (kinds.includes("board")) cand.push({ kind: "board", pos: new THREE.Vector3(0, 1.7, -8.9) });
  for (let tries = 0; tries < 6 && cand.length; tries++) {
    const m = cand[Math.floor(Math.random() * cand.length)];
    const pos = m.kind === "head" ? m.pos : m.kind === "board" ? m.pos : m.obj.getWorldPosition(new THREE.Vector3());
    if (isVisible(pos)) continue;
    if (m.kind === "roller") {
      const target = new THREE.Vector3(PLAYER_POS.x + (Math.random() < 0.5 ? -1.5 : 1.5), 0, PLAYER_POS.z + rand(0.4, 1.6));
      const dir = target.clone().sub(m.obj.position); const d = dir.length();
      if (d > 1.0) { m.obj.position.addScaledVector(dir.normalize(), Math.min(0.9, d - 0.9)); m.obj.rotation.y += rand(-1, 1); if (Math.random() < 0.4) audio.play("chair_roll", { volume: 0.25, pan: panFor(m.obj.position) }); }
    } else if (m.kind === "ruler") {
      const dx = PLAYER_POS.x - m.obj.position.x, dz = PLAYER_POS.z - m.obj.position.z;
      m.obj.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      if (m.step < 3) { m.obj.position.x += dx * 0.04; m.obj.position.z += dz * 0.04; m.step++; }
    } else if (m.kind === "head") {
      m.turned = !m.turned; m.head.rotation.y = m.turned ? Math.PI : 0;
    } else if (m.kind === "poster") {
      m.obj.material.map = m.creepy ? m.tN : m.tC; m.creepy = !m.creepy; m.obj.material.needsUpdate = true;
    } else if (m.kind === "door") {
      m.obj.rotation.y = Math.min(1.2, m.obj.rotation.y + 0.35); if (Math.random() < 0.5) audio.play("creak", { volume: 0.3, pan: 0.9 });
    } else if (m.kind === "board") {
      room.boardScrawl(S.i >= 4 ? "LOOK AT ME" : "EYES UP FRONT");
    }
    return;
  }
}

// ---------- view / camera
const tmpV = new THREE.Vector3();
function applyView(k) {
  let ty = view.yaw, tp = view.pitch;
  if (view.mode === "laptop") { ty = 0; tp = view.glance ? -0.1 : -0.3; }
  view.cy = view.cy === undefined ? ty : lerp(view.cy, ty, k);
  view.cp = view.cp === undefined ? tp : lerp(view.cp, tp, k);
  camera.rotation.set(view.cp, view.cy, 0);
  const lean = view.mode === "laptop" && !view.glance ? 0.06 : 0;
  camera.position.set(PLAYER_POS.x, PLAYER_POS.y - lean * 0.5, PLAYER_POS.z - lean);
}

// ---------- main update
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const time = now / 1000;
  psx.uniforms.uTime.value = time;
  if (mode === "title" || mode === "card") { titleScene(time); psx.render(scene, camera); return; }
  if (mode === "paused") { psx.render(scene, camera); return; }
  update(dt, time);
  psx.render(scene, camera);
}

function titleScene(t) {
  // slow drift through the room behind the menu
  camera.position.set(Math.sin(t * 0.1) * 2, 1.7, 4.5);
  camera.rotation.set(-0.12, Math.sin(t * 0.07) * 0.3, 0);
  if (!teacher.cfg || !teacher.cfg.title) { teacher.reset({ title: true }); }
  teacher.yaw = Math.PI; teacher.armWrite = 1; teacher.animate(0.016); teacher.updateCone({});
}

function update(dt, time) {
  const cfg = S.cfg;
  if (view.lockT > 0) view.lockT -= dt;
  // sequences
  if (S.seq) {
    if (S.seq.kind === "scare") { S.seq.t += dt; if (S.seq.t >= S.seq.dur) endScare(); }
    else if (S.seq.kind === "slip") { S.seq.t += dt; if (S.seq.t >= S.seq.dur) endSlip(); }
    else if (S.seq.kind === "lightsOut") updateLightsOut(dt);
  }
  applyView(Math.min(1, dt * 9));
  camera.updateMatrixWorld();
  projM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projM);

  // laptop lid + book animation
  const lidTarget = view.mode === "laptop" ? 1 : 0.25;
  room.setLid(lerp(room.lidOpen, lidTarget, Math.min(1, dt * 10)));
  room.setBook(lerp(room.bookUp, S.bookTarget, Math.min(1, dt * 10)));

  // post effects for laptop focus
  const headDown = view.mode === "laptop" && !view.glance;
  if (view.mode === "laptop") {
    tmpV.set(0, 0.3, 0); room.lid.localToWorld(tmpV); tmpV.project(camera);
    psx.uniforms.uSplit.value = clamp((tmpV.y + 1) / 2 + 0.03, 0.3, 0.98);
    psx.uniforms.uBlur.value = lerp(psx.uniforms.uBlur.value, view.glance ? 0.3 : 1, dt * 8);
  } else psx.uniforms.uBlur.value = lerp(psx.uniforms.uBlur.value, 0, dt * 8);

  if (mode !== "play") return finishFrame(dt, time);

  // ---- time
  S.t += dt;
  const prog = S.t / cfg.dur;
  if (S.clockBack > 0) { S.clockBack -= dt; S.clockMin -= dt * 2; } else S.clockMin = 60 + 50 * prog;
  if (Math.floor(S.clockMin * 4) !== S._lastClock) { S._lastClock = Math.floor(S.clockMin * 4); room.setClock(12 * 60 + S.clockMin); }
  const tot = 12 * 60 + Math.floor(S.clockMin), h = Math.floor(tot / 60) % 12 || 12;
  $("clock").textContent = `${h}:${String(tot % 60).padStart(2, "0")}`;

  // scripted events
  for (const ev of S.events) {
    if (!ev.done && prog >= ev.t) {
      ev.done = true;
      if (ev.say) say(ev.say);
      if (ev.hint !== undefined) hint(ev.hint);
      if (ev.fx) runFx(ev.fx);
    }
  }
  if (S.subUntil && S.t > S.subUntil) { $("subtitle").textContent = ""; S.subUntil = 0; }
  if (cfg.stalkFrom !== undefined && prog >= cfg.stalkFrom && !S.stalk && !S.behind) runFx("stalk");
  // stalking comes in bursts: between them she teaches normally so you get chances to use the laptop
  if (S.stalk && !teacher.stalking && !S.behind && S.stalkRest > 0) {
    S.stalkRest -= dt;
    if (S.stalkRest <= 0 && teacher.state === "write") { teacher.stalking = true; teacher.path = []; teacher.reached = false; teacher.seenT = 0; audio.play("creak", { volume: 0.4, rate: 0.7 }); }
  }

  // ---- laptop / urge / fun
  S.essayLock = Math.max(0, S.essayLock - dt);
  const laptopActive = view.mode === "laptop" && room.lidOpen > 0.6;
  const out = laptop.update(dt, laptopActive);
  if (out.notify) { audio.play("notify", { volume: 1 }); if (teacher.distToPlayer() < 4.5) teacher.sus = Math.min(100, teacher.sus + 10); }
  const bad = room.lidOpen > 0.35; // any open laptop is against the rules
  if (bad) S.laptopTime += dt;
  const glanceMul = view.glance ? 0.5 : 1;
  if (bad && (out.drain > 0)) S.urge -= out.drain * glanceMul * dt;
  else S.urge += cfg.urge * dt * (S.finale ? 1.6 : 1);
  S.fun = Math.max(0, S.fun + out.fun * glanceMul * dt + out.burst);
  S.urge -= out.drainBurst;
  if (S.urge >= 100 && S.forced <= 0) forceLaptop();
  S.forced -= dt;
  S.urge = clamp(S.urge, 0, 100);

  // video sound loop
  const videoOn = bad && laptop.app === "tube" && laptop.sound && laptop.buffering <= 0 && !laptop.live;
  audio.setLoop("video", videoOn ? 0.9 : 0, 0.08);
  audio.setLoop("static", laptop.live || (bad && laptop.video.kind === "static") ? 0.6 : 0);
  const noise = out.noise + (S.forced > 0 ? 1.5 : 0);

  // ---- teacher
  const headPos = teacher.head.getWorldPosition(new THREE.Vector3());
  const seen = teacher.group.visible && frustum.containsPoint(headPos) && !headDown && !S.lightsOut;
  teacher.update(dt, { seen, headDown });
  if (teacher.group.visible && !S.behind) {
    const det = teacher.detect(dt, { bad, book: room.bookUp, noise, lightsOut: S.lightsOut });
    if (teacher.sus >= 100) caught();
  }
  if (S.stalk && teacher.stalking && teacher.reached && (seen || teacher.reachedT > 2.2) && mode === "play" && !S.over) {
    jumpscare({ strike: true, line: "found" });
  }
  // chalk loop: she writes; on later days the chalk keeps going after she has turned (the tell lies)
  const chalkOn = teacher.group.visible && !teacher.stalking && (teacher.state === "write" || (teacher.lied && ["turn", "watch"].includes(teacher.state)));
  audio.setLoop("chalk", chalkOn ? 1 : 0, 0.05);
  if (chalkOn && Math.random() < dt * 0.6) audio.play("chalk_tap", { volume: 0.5 });
  if (S.behind) updateBehind(dt);
  if (S.ghostT > 0) { S.ghostT -= dt; if (S.ghostT <= 0) ghost.group.visible = false; }

  // ---- room creep
  if (cfg.creep && Math.random() < cfg.creep * dt * (headDown ? 2 : 1)) creep();

  // ---- lights flicker
  if (S.flicker > 0) {
    S.flicker -= dt;
    room.setLights(Math.random() < 0.3 ? 0.05 : cfg.lights * (S.finale ? 0.06 : 1));
    if (S.flicker <= 0) room.setLights(S.finale ? 0.06 : cfg.lights);
  } else if (S.i >= 2 && Math.random() < dt * 0.05 && !S.lightsOut) { S.flicker = rand(0.2, 0.6); }

  // ---- audio mix
  audio.setLoop("heart", clamp((teacher.sus - 35) / 50, 0, 1));
  audio.setLoop("tick", S.i >= 3 ? 0.6 : 1);

  // ---- end of class
  if (S.t >= cfg.dur && !S.over) endOfClass();
  finishFrame(dt, time);
}

function forceLaptop() {
  // the urge wins: the laptop opens and something LOUD plays
  S.forced = 2.5; S.urge = 55;
  view.mode = "laptop"; laptop.essay = false; laptop.app = "tube"; laptop.buffering = 0; S.essayLock = 2.0;
  audio.play("blast", { volume: 1, cooldown: 0 });
  teacher.sus = Math.min(100, teacher.sus + (teacher.group.visible ? 35 : 0));
  hint("You couldn't help it.");
  setTimeout(() => { if (S) hint(""); }, 2500);
}

function finishFrame(dt, time) {
  // live feed on the laptop
  const showFeed = laptop.live && view.mode === "laptop";
  feedPlane.visible = showFeed;
  if (showFeed && Math.floor(time * 15) !== S._feedTick) {
    S._feedTick = Math.floor(time * 15);
    me.obj.visible = true;
    me.head.rotation.y = 0;
    const r = psx.renderer; const prevFog = scene.fog;
    feedPlane.visible = false;
    r.setRenderTarget(feedRT); r.render(scene, feedCam); r.setRenderTarget(null);
    feedPlane.visible = true;
  }
  me.obj.visible = showFeed;
  laptop.draw(time);
  room.screenT.needsUpdate = true;
  // hud
  const quota = S.cfg.quota || 1;
  $("urgeBar").style.width = S.urge + "%";
  $("funBar").style.width = clamp(S.fun / (quota * 1.25) * 100, 0, 100) + "%";
  $("funQuota").style.left = (100 / 1.25) + "%";
  $("susBar").style.width = teacher.sus + "%";
  $("suspicion").classList.toggle("on", teacher.sus > 1);
  $("eye").style.color = teacher.inCone ? "#f44" : "#fff";
  $("strikes").textContent = "X".repeat(S.strikes) + "_".repeat(Math.max(0, 3 - S.strikes));
  psx.uniforms.uUrge.value = clamp((S.urge - 60) / 40, 0, 1);
  psx.uniforms.uRed.value = lerp(psx.uniforms.uRed.value, (S.cfg.red || 0) * 0.5 + (S.finale ? 0.4 : 0) + teacher.sus / 400, dt * 3);
}

// ---------- end of day
function endOfClass() {
  S.over = true;
  audio.play("bell");
  teacher.sus = 0;
  const cfg = S.cfg;
  if (cfg.finalDay) {
    const perfect = S.laptopTime < 12;
    setTimeout(() => {
      if (perfect) { say("perfect"); setTimeout(() => { jumpscare({}); setTimeout(() => ending("perfect"), 1300); }, 2600); }
      else { say("dismiss5"); setTimeout(() => ending("survive"), 3000); }
    }, 1500);
    return;
  }
  say("dismiss");
  const passed = S.fun >= cfg.quota;
  setTimeout(() => {
    audio.stopAll();
    if (passed) {
      audio.play("win");
      if (S.i + 1 >= unlocked) { unlocked = Math.min(5, S.i + 2); try { localStorage.setItem("euf_unlocked", unlocked); } catch (e) {} }
      showCard(`<h2>BELL</h2><p>You made it through ${cfg.name.toLowerCase()}.</p><p>Fun ${Math.floor(S.fun)} / ${cfg.quota} &nbsp; Strikes ${S.strikes}/3</p>`, () => startDayCard(S.i + 1));
    } else {
      audio.play("lose");
      showCard(`<h2>NOT ENOUGH</h2><p>You sat through the whole period without enough fun. The urge is still there.</p><p>Fun ${Math.floor(S.fun)} / ${cfg.quota}</p>`, () => startDayCard(S.i));
    }
  }, 2200);
}
function failDay() {
  S.over = true;
  const cfg = S.cfg;
  if (cfg.finalDay) { say("c4"); setTimeout(() => ending("caught"), 2500); return; }
  setTimeout(() => {
    say(S.i >= 2 ? "c4" : "c1");
    setTimeout(() => {
      audio.stopAll();
      showCard(`<h2>${S.i >= 2 ? "SEE ME AFTER CLASS" : "DETENTION"}</h2><p>${S.i >= 2 ? "You stay after class.<br><br>Tomorrow, there's one more empty desk." : "Three strikes. Mrs. Halloway keeps you after the bell to 'talk about focus'."}</p>`, () => startDayCard(S.i));
    }, 2200);
  }, 600);
}
function ending(kind) {
  audio.stopAll();
  endingsSeen[kind] = true; try { localStorage.setItem("euf_endings", JSON.stringify(endingsSeen)); } catch (e) {}
  const E = {
    survive: ["THE BELL", "You run. The hallway is empty and the doors open onto a grey afternoon.<br><br>When you look back through the little window in the door, Mrs. Halloway is teaching a full class.<br>One of the students sitting in your seat looks exactly like you.<br>It isn't looking down."],
    caught: ["SEE ME AFTER CLASS", "She keeps you after school.<br><br>On Monday there is a new photo on the back wall of Room 113.<br>Its eyes have been scratched out."],
    perfect: ["PERFECT STUDENT", "You never looked away. Not once.<br><br>Something in her gave out. She'd been feeding on wandering attention for decades, and you gave her none.<br><br>The photos on the back wall are blank now. All of them.<br><br><i>Secret ending found.</i>"],
  }[kind];
  const count = Object.keys(endingsSeen).length;
  showCard(`<h2>${E[0]}</h2><p>${E[1]}</p><p class="small">Endings found: ${count}/3</p>`, () => { mode = "title"; $("title").classList.remove("hidden"); buildDaySelect(); audio.loop("lofi", "lofi", { volume: 1 }); });
}

// ---------- boot
buildDaySelect();
$("startPrompt").textContent = "LOADING...";
audio.load((p) => { $("startPrompt").textContent = `LOADING ${Math.floor(p * 100)}%`; }).then(() => {
  loaded = true;
  $("startPrompt").textContent = "CLICK TO START CLASS";
  const startLofi = () => { if (mode === "title") audio.loop("lofi", "lofi", { volume: 1 }); removeEventListener("pointerdown", startLofi); };
  addEventListener("pointerdown", startLofi);
  if (startQueued) startDayCard(selectedDay);
});
requestAnimationFrame(frame);

// debug hooks for testing
window.__euf = { get S() { return S; }, teacher, room, laptop, view, startDay, jumpscare, runFx, get mode() { return mode; } };
