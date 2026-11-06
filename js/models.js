// Higher-detail low-poly models: people, desks, chairs, props
import * as THREE from "three";
import { lit, canvasTex, noise } from "./psx.js";

const G = {}; // shared geometry cache
const geo = (key, make) => G[key] || (G[key] = make());
export const cyl = (rt, rb, h, seg = 8) => geo(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const cap = (r, len, seg = 6) => geo(`p${r}_${len}_${seg}`, () => new THREE.CapsuleGeometry(r, len, 2, seg));
export const sph = (r, w = 10, h = 8) => geo(`s${r}_${w}_${h}`, () => new THREE.SphereGeometry(r, w, h));
export const bx = (w, h, d) => geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
export function mesh(g, m, x = 0, y = 0, z = 0, parent) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (parent) parent.add(o); return o;
}
const M = {};
export const mat = (key, make) => M[key] || (M[key] = make());
export const col = (c) => mat("col" + c, () => lit({ color: new THREE.Color(c) }));

// ---------- face textures (sphere UV: front of the head is u=0.25)
export function drawEyesMouth(g, cx, cy, s, o) {
  const eye = o.eyes || "normal";
  const ex1 = cx - s * 0.32, ex2 = cx + s * 0.32, ey = cy - s * 0.08;
  // brows
  if (eye === "normal" || eye === "wide") { g.fillStyle = o.brow || "#3a2418"; g.fillRect(ex1 - s * 0.16, ey - s * 0.26, s * 0.3, s * 0.06); g.fillRect(ex2 - s * 0.14, ey - s * 0.26, s * 0.3, s * 0.06); }
  if (eye === "normal") {
    for (const ex of [ex1, ex2]) {
      g.fillStyle = "#f4f0ea"; g.beginPath(); g.ellipse(ex, ey, s * 0.15, s * 0.09, 0, 0, 7); g.fill();
      g.fillStyle = o.iris || "#4a3020"; g.beginPath(); g.arc(ex, ey, s * 0.075, 0, 7); g.fill();
      g.fillStyle = "#000"; g.beginPath(); g.arc(ex, ey, s * 0.035, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.fillRect(ex + s * 0.02, ey - s * 0.05, s * 0.03, s * 0.03);
      g.strokeStyle = "rgba(60,30,20,0.6)"; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.ellipse(ex, ey - s * 0.01, s * 0.15, s * 0.09, 0, Math.PI, 0); g.stroke();
    }
  } else if (eye === "wide") {
    for (const ex of [ex1, ex2]) { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(ex, ey, s * 0.17, s * 0.15, 0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(ex, ey, s * 0.03, 0, 7); g.fill(); }
  } else if (eye === "black") {
    for (const ex of [ex1, ex2]) { g.fillStyle = "#000"; g.beginPath(); g.ellipse(ex, ey + s * 0.03, s * 0.14, s * 0.2, ex < cx ? 0.2 : -0.2, 0, 7); g.fill(); }
  } else if (eye === "scratch") {
    g.strokeStyle = "#200"; g.lineWidth = 2;
    for (const ex of [ex1, ex2]) for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(ex - s * 0.15 + Math.random() * 3, ey - s * 0.12); g.lineTo(ex + s * 0.15 - Math.random() * 3, ey + s * 0.12); g.stroke(); }
  }
  // nose
  if (eye !== "none") { g.fillStyle = "rgba(90,40,30,0.35)"; g.fillRect(cx - s * 0.04, cy + s * 0.1, s * 0.09, s * 0.05); }
  const mouth = o.mouth || "flat", my = cy + s * 0.32;
  if (mouth === "flat") { g.fillStyle = "#8a3a34"; g.fillRect(cx - s * 0.15, my, s * 0.3, s * 0.05); }
  else if (mouth === "smile") { g.fillStyle = "#8a3a34"; g.beginPath(); g.ellipse(cx, my - s * 0.02, s * 0.18, s * 0.08, 0, 0, Math.PI); g.fill(); }
  else if (mouth === "grin") {
    g.fillStyle = "#1a0505"; g.beginPath(); g.ellipse(cx, my, s * 0.36, s * 0.1, 0, 0, 7); g.fill();
    g.fillStyle = "#e8e0d0"; for (let i = -4; i <= 4; i++) g.fillRect(cx + i * s * 0.075 - s * 0.025, my - s * 0.07, s * 0.05, s * 0.06);
  } else if (mouth === "open") { g.fillStyle = "#000"; g.beginPath(); g.ellipse(cx, my + s * 0.05, s * 0.13, s * 0.24, 0, 0, 7); g.fill(); }
  if (o.blood) { g.fillStyle = "#5a0000"; for (const ex of [ex1, ex2]) g.fillRect(ex - 1, ey + s * 0.15, 2, s * 0.5); }
  if (o.blush) { g.fillStyle = "rgba(220,90,90,0.18)"; g.fillRect(ex1 - s * 0.12, cy + s * 0.12, s * 0.2, s * 0.08); g.fillRect(ex2 - s * 0.08, cy + s * 0.12, s * 0.2, s * 0.08); }
}

export function headTex(o) {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = o.skin; g.fillRect(0, 0, w, h);
    // subtle shading toward the back
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "rgba(0,0,0,0.12)"); gr.addColorStop(0.25, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(0,0,0,0.15)"); gr.addColorStop(0.75, "rgba(0,0,0,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (o.hair) { g.fillStyle = o.hair; g.fillRect(0, 0, w, h * 0.3); g.fillRect(w * 0.42, 0, w * 0.66, h * (o.long ? 0.95 : 0.62)); g.fillRect(0, 0, w * 0.1, h * 0.5); g.fillRect(w * 0.38, 0, w * 0.06, h * 0.5);
      // fringe
      for (let x = 12; x < 52; x += 4) g.fillRect(x, h * 0.28, 3, h * (0.04 + Math.random() * 0.05));
    }
    if (o.eyes !== "none") drawEyesMouth(g, 32, 34, 30, o);
    if (o.glasses) { g.strokeStyle = "#1a1a1a"; g.lineWidth = 1.5; g.strokeRect(17, 27, 13, 9); g.strokeRect(34, 27, 13, 9); g.beginPath(); g.moveTo(30, 30); g.lineTo(34, 30); g.stroke(); }
    noise(g, w, h, 8);
  });
}

// ---------- seated student (local forward = +z, toward the desk)
export function makeSeated(o) {
  const root = new THREE.Group();
  const shirt = lit({ color: new THREE.Color(o.shirt) });
  const pants = col(o.pants || "#2a3550");
  const skin = lit({ color: new THREE.Color(o.skin) });
  const hairM = lit({ color: new THREE.Color(o.hair) });
  const shoe = col("#1e1e22");
  const parts = { cloth: [], skin: [], hair: [], pants: [] };
  const add = (g, m, x, y, z, list, parent = root) => { const k = mesh(g, m, x, y, z, parent); if (list) parts[list].push(k); return k; };
  // legs
  for (const s of [-1, 1]) {
    const th = add(cap(0.072, 0.26), pants, 0.1 * s, 0.5, 0.15, "pants"); th.rotation.x = Math.PI / 2;
    const sh = add(cap(0.058, 0.3), pants, 0.1 * s, 0.26, 0.33, "pants");
    const sn = add(bx(0.1, 0.07, 0.2), shoe, 0.1 * s, 0.035, 0.38);
  }
  // torso
  const torso = add(cyl(0.2, 0.17, 0.46, 10), shirt, 0, 0.77, 0.0, "cloth"); torso.scale.z = 0.62; torso.rotation.x = 0.1;
  const shoulders = add(cap(0.1, 0.24, 6), shirt, 0, 0.97, 0.01, "cloth"); shoulders.rotation.z = Math.PI / 2; shoulders.scale.set(1, 1, 0.75);
  if (o.hood) { const hd = add(cyl(0.16, 0.18, 0.08, 10), shirt, 0, 1.02, -0.05, "cloth"); hd.scale.z = 0.7; }
  // arms resting on the desk
  for (const s of [-1, 1]) {
    const up = add(cap(0.052, 0.18), shirt, 0.22 * s, 0.89, 0.07, "cloth"); up.rotation.x = -0.62; up.rotation.z = 0.12 * s;
    const fo = add(cap(0.046, 0.2), o.short ? skin : shirt, 0.19 * s, 0.815, 0.27, o.short ? "skin" : "cloth"); fo.rotation.x = Math.PI / 2; fo.rotation.y = -0.25 * s;
    add(sph(0.045, 6, 5), skin, 0.13 * s, 0.81, 0.41, "skin");
  }
  // neck + head
  add(cyl(0.05, 0.055, 0.1, 8), skin, 0, 1.05, 0, "skin");
  const head = new THREE.Group(); head.position.set(0, 1.18, 0.01); root.add(head);
  const tex = headTex({ skin: o.skin, hair: o.hair, long: o.long, iris: o.iris, blush: o.long });
  const blank = headTex({ skin: "#d8d0c4", eyes: "none" });
  const faceM = lit({ map: tex });
  const skull = mesh(sph(0.12, 14, 10), faceM, 0, 0, 0, head); skull.scale.set(0.95, 1.1, 1.0); skull.rotation.y = 0;
  // ears
  for (const s of [-1, 1]) { const e = mesh(sph(0.03, 5, 4), skin, 0.112 * s, -0.005, 0, head); e.scale.set(0.5, 1, 0.8); parts.skin.push(e); }
  // hair volume
  const cap1 = mesh(geo("hairCap", () => new THREE.SphereGeometry(0.128, 14, 8, 0, Math.PI * 2, 0, 1.45)), hairM, 0, 0.012, -0.01, head);
  cap1.scale.set(0.98, 1.1, 1.04); cap1.rotation.x = -0.3; parts.hair.push(cap1);
  if (o.long) { const back = mesh(bx(0.24, 0.3, 0.07), hairM, 0, -0.1, -0.09, head); parts.hair.push(back); }
  if (o.pony) { const p = mesh(cap(0.04, 0.14), hairM, 0, -0.02, -0.15, head); p.rotation.x = 0.5; parts.hair.push(p); }
  if (o.glasses) { const gm = col("#111111"); for (const s of [-1, 1]) { const r = mesh(geo("lens", () => new THREE.TorusGeometry(0.028, 0.005, 4, 10)), gm, 0.042 * s, 0.01, 0.118, head); } }
  return { root, head, skull, faceM, tex, blank, parts, mats: { shirt, pants, skin, hairM } };
}

// ---------- the teacher (standing; local forward = +z)
export function makeTeacherBody(faceTex) {
  const g = new THREE.Group();
  const card = col("#6e1e2a"), blouse = col("#e8e0d0"), skirt = col("#262636"), stock = col("#2a1c1c"), skin = col("#e6c6a4"), hair = col("#77777c"), shoe = col("#121212");
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.085 * s, 0.6, 0); g.add(hip);
    mesh(cap(0.05, 0.44), stock, 0, -0.29, 0, hip);
    mesh(bx(0.08, 0.05, 0.18), shoe, 0, -0.55, 0.04, hip);
    mesh(bx(0.03, 0.07, 0.03), shoe, 0, -0.565, -0.04, hip);
    legs.push(hip);
  }
  const sk = mesh(cyl(0.16, 0.21, 0.44, 10), skirt, 0, 0.71, 0, g); sk.scale.z = 0.72;
  const body = new THREE.Group(); body.position.y = 0.92; g.add(body);
  const torso = mesh(cyl(0.2, 0.165, 0.5, 10), card, 0, 0.25, 0, body); torso.scale.z = 0.62;
  const front = mesh(bx(0.1, 0.44, 0.02), blouse, 0, 0.27, 0.122, body);
  mesh(cap(0.1, 0.24, 6), card, 0, 0.47, 0, body).rotation.z = Math.PI / 2;
  // pearl necklace
  for (let i = -3; i <= 3; i++) mesh(sph(0.012, 4, 3), col("#f0ece0"), i * 0.022, 0.5 - Math.abs(i) * 0.012, 0.11, body);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.24 * s, 0.45, 0); body.add(sh);
    mesh(cap(0.05, 0.22), card, 0, -0.15, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    mesh(cap(0.045, 0.2), card, 0, -0.12, 0, el);
    mesh(sph(0.045, 6, 5), skin, 0, -0.27, 0, el);
    sh.userData.elbow = el; arms.push(sh);
  }
  const neck = new THREE.Group(); neck.position.y = 0.52; body.add(neck);
  const neckMesh = mesh(cyl(0.042, 0.05, 0.1, 8), skin, 0, 0.05, 0, neck);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.1; neck.add(headPivot);
  const faceMat = lit({ map: faceTex });
  const head = mesh(sph(0.125, 14, 10), faceMat, 0, 0.12, 0, headPivot); head.scale.set(0.92, 1.12, 1);
  for (const s of [-1, 1]) mesh(sph(0.03, 5, 4), skin, 0.112 * s, 0.11, 0, headPivot).scale.set(0.5, 1, 0.8);
  const hc = mesh(geo("tHair", () => new THREE.SphereGeometry(0.133, 14, 8, 0, Math.PI * 2, 0, 1.35)), hair, 0, 0.135, -0.01, headPivot); hc.scale.set(0.96, 1.12, 1.05); hc.rotation.x = -0.35;
  mesh(sph(0.07, 8, 6), hair, 0, 0.26, -0.11, headPivot);
  const gm = col("#141414");
  for (const s of [-1, 1]) mesh(geo("tLens", () => new THREE.TorusGeometry(0.03, 0.005, 4, 10)), gm, 0.043 * s, 0.13, 0.12, headPivot);
  mesh(bx(0.03, 0.006, 0.006), gm, 0, 0.13, 0.122, headPivot);
  return { group: g, body, arms, legs, neck, neckMesh, headPivot, head, faceMat };
}

// ---------- furniture
export function makeDesk(woodM) {
  const d = new THREE.Group();
  const metal = col("#5a5e66"), dark = col("#2e3034");
  mesh(bx(1.0, 0.04, 0.6), woodM, 0, 0.74, 0, d);
  mesh(bx(0.98, 0.015, 0.015), col("#3a2a1a"), 0, 0.71, 0.29, d);
  mesh(bx(0.88, 0.1, 0.46), dark, 0, 0.64, -0.03, d); // book box
  for (const [x, z] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) mesh(cyl(0.017, 0.017, 0.6, 6), metal, x, 0.32, z, d);
  for (const x of [-0.45, 0.45]) { mesh(bx(0.03, 0.025, 0.56), metal, x, 0.02, 0, d); }
  mesh(bx(0.9, 0.02, 0.02), metal, 0, 0.12, -0.25, d);
  return d;
}
export function makeChair(plasticM, rolling = false) {
  const g = new THREE.Group();
  const metal = col("#4e525a");
  const seat = mesh(bx(0.42, 0.04, 0.4), plasticM, 0, 0.45, 0, g);
  const lip = mesh(bx(0.38, 0.03, 0.04), plasticM, 0, 0.425, -0.2, g);
  const back = mesh(bx(0.42, 0.28, 0.03), plasticM, 0, 0.78, 0.2, g); back.rotation.x = -0.12;
  for (const x of [-0.17, 0.17]) mesh(cyl(0.014, 0.014, 0.36, 5), metal, x, 0.62, 0.2, g);
  if (rolling) {
    mesh(cyl(0.025, 0.025, 0.36, 6), metal, 0, 0.25, 0, g);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = mesh(bx(0.28, 0.025, 0.035), metal, Math.cos(a) * 0.14, 0.05, Math.sin(a) * 0.14, g); leg.rotation.y = -a; mesh(sph(0.025, 5, 4), col("#111111"), Math.cos(a) * 0.27, 0.025, Math.sin(a) * 0.27, g); }
  } else {
    for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) mesh(cyl(0.014, 0.014, 0.44, 5), metal, x, 0.22, z, g);
  }
  return g;
}
export function makeBackpack(color) {
  const g = new THREE.Group(); const m = col(color);
  const b = mesh(bx(0.3, 0.38, 0.16), m, 0, 0.19, 0, g);
  mesh(bx(0.24, 0.16, 0.05), col("#222222"), 0, 0.14, 0.1, g);
  const top = mesh(cyl(0.15, 0.15, 0.16, 8, 1), m, 0, 0.38, 0, g); top.rotation.z = Math.PI / 2; top.scale.set(0.5, 1, 1);
  return g;
}
