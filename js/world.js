// The classroom: room, desks, classmates, props, player desk, lights
import * as THREE from "three";
import { lit, flat, canvasTex, noise } from "./psx.js";
import { makeSeated, makeDesk, makeChair, makeBackpack, mesh, bx, cyl, sph, col, drawEyesMouth } from "./models.js";

export const COLS = [-4.5, -1.5, 1.5, 4.5];
export const ROWS = [-3.2, -0.8, 1.6, 4.0];
export const PLAYER_SEAT = { c: 2, r: 2 };
export const PLAYER_POS = new THREE.Vector3(COLS[2], 1.16, ROWS[2] + 0.5);
const RW = 7, FZ = -9, BZ = 7, H = 3.2; // room half-width, front/back z, height

export const CLASSMATES = [
  { name: "Tyler", c: 1, r: 1, skin: "#e0b48c", hair: "#5a3a1e", shirt: "#c23b3b", hood: true },
  { name: "Priya", c: 2, r: 1, skin: "#a8754f", hair: "#1b1110", shirt: "#3b6fc2", long: true },
  { name: "Marcus", c: 3, r: 2, skin: "#6e4a2f", hair: "#120c08", shirt: "#e0c040", short: true },
  { name: "Emma", c: 0, r: 2, skin: "#f1c9a5", hair: "#d8b25a", shirt: "#62a35a", pony: true },
  { name: "Jayden", c: 0, r: 0, skin: "#8d5b3c", hair: "#1a1a1a", shirt: "#7b4bb0", hood: true },
  { name: "Sophie", c: 1, r: 0, skin: "#f0c8a8", hair: "#8a3a1c", shirt: "#d86a9a", long: true },
  { name: "Leo", c: 2, r: 0, skin: "#d9a77c", hair: "#2e2015", shirt: "#3aa0a0", glasses: true },
  { name: "Ava", c: 3, r: 0, skin: "#c48a62", hair: "#3a2414", shirt: "#e08a3a", pony: true },
  { name: "Noah", c: 3, r: 1, skin: "#e6b996", hair: "#6b4a2a", shirt: "#4a4a8a", short: true },
  { name: "Mia", c: 0, r: 1, skin: "#b57a52", hair: "#140d09", shirt: "#a0a0a0", long: true },
  { name: "Sam", c: 1, r: 2, skin: "#e8bf9a", hair: "#3a2a1a", shirt: "#2f8f4f", hood: true },
  { name: "Owen", c: 1, r: 3, skin: "#d4a07a", hair: "#4a3020", shirt: "#8a5a3a", glasses: true },
  { name: "Lily", c: 3, r: 3, skin: "#f3d0b0", hair: "#c06030", shirt: "#5a8ad8", long: true },
];

// flat face (used for photos and the scare overlay)
export function drawFace(g, w, h, o = {}) {
  g.fillStyle = o.skin || "#e8c09a"; g.fillRect(0, 0, w, h);
  if (o.hair) { g.fillStyle = o.hair; g.fillRect(0, 0, w, h * 0.22); }
  drawEyesMouth(g, w / 2, h * 0.52, Math.min(w, h * 0.9), o);
}

// decals sit in front of walls: polygon offset stops z-fighting
function decal(params) { const m = lit(params); m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; return m; }

export class Classroom {
  constructor(scene) {
    this.scene = scene;
    this.mutables = [];
    this.lightPanels = [];
    this.build();
  }

  build() {
    const S = this.scene;
    // ---------- textures
    const floorT = canvasTex(64, 64, (g) => {
      const c = ["#c9bea4", "#b5aa90", "#c2b79c", "#ad9f84"];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = c[(i + j * 3 + (i * j)) % 4]; g.fillRect(i * 16, j * 16, 16, 16); }
      g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i <= 4; i++) { g.fillRect(i * 16, 0, 1, 64); g.fillRect(0, i * 16, 64, 1); }
      for (let i = 0; i < 90; i++) { g.fillStyle = Math.random() < 0.5 ? "rgba(70,60,40,0.25)" : "rgba(255,255,255,0.18)"; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); }
      noise(g, 64, 64, 8);
    }, [7, 8]);
    // painted cinder block: green lower band, rail, cream upper
    const wallT = canvasTex(64, 128, (g) => {
      g.fillStyle = "#ddd5bc"; g.fillRect(0, 0, 64, 128);
      g.fillStyle = "rgba(0,0,0,0.09)";
      for (let y = 0; y < 92; y += 8) { g.fillRect(0, y, 64, 1); const off = (y / 8) % 2 ? 16 : 0; for (let x = off; x < 64; x += 32) g.fillRect(x, y, 1, 8); }
      g.fillStyle = "#6f8f7c"; g.fillRect(0, 92, 64, 36);
      g.fillStyle = "rgba(0,0,0,0.1)"; for (let y = 96; y < 124; y += 8) { g.fillRect(0, y, 64, 1); const off = (y / 8) % 2 ? 16 : 0; for (let x = off; x < 64; x += 32) g.fillRect(x, y, 1, 8); }
      g.fillStyle = "#8a6a44"; g.fillRect(0, 90, 64, 3);
      g.fillStyle = "#3a3a36"; g.fillRect(0, 123, 64, 5);
      noise(g, 64, 128, 7);
    });
    wallT.wrapS = THREE.RepeatWrapping;
    const ceilT = canvasTex(64, 64, (g) => {
      g.fillStyle = "#e9e5da"; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(120,110,90,0.25)"; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); }
      g.fillStyle = "#b8b3a5"; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); g.fillRect(0, 32, 64, 1); g.fillRect(32, 0, 1, 64);
      g.fillStyle = "rgba(150,120,60,0.15)"; g.beginPath(); g.arc(44, 46, 6, 0, 7); g.fill();
    }, [7, 8]);
    this.woodT = canvasTex(64, 32, (g) => {
      g.fillStyle = "#c08a52"; g.fillRect(0, 0, 64, 32);
      for (let y = 0; y < 32; y += 2) { g.fillStyle = `rgba(110,60,20,${0.08 + Math.random() * 0.12})`; g.fillRect(0, y, 64, 1); }
      g.fillStyle = "rgba(90,50,20,0.25)"; g.beginPath(); g.ellipse(40, 16, 7, 3, 0, 0, 7); g.fill();
      noise(g, 64, 32, 10);
    });
    const woodM = lit({ map: this.woodT });

    // ---------- shell (each surface is one plane exactly on the room bounds, nothing coplanar)
    const floor = mesh(new THREE.PlaneGeometry(RW * 2, BZ - FZ, 14, 16), lit({ map: floorT }), 0, 0, (FZ + BZ) / 2, S); floor.rotation.x = -Math.PI / 2;
    const ceil = mesh(new THREE.PlaneGeometry(RW * 2, BZ - FZ, 7, 8), lit({ map: ceilT }), 0, H, (FZ + BZ) / 2, S); ceil.rotation.x = Math.PI / 2;
    const mkWall = (w, x, z, ry) => {
      const t = wallT.clone(); t.needsUpdate = true; t.repeat.set(w / 2, 1);
      const m = mesh(new THREE.PlaneGeometry(w, H, Math.ceil(w), 4), lit({ map: t }), x, H / 2, z, S); m.rotation.y = ry; return m;
    };
    mkWall(RW * 2, 0, FZ, 0); mkWall(RW * 2, 0, BZ, Math.PI); mkWall(BZ - FZ, -RW, (FZ + BZ) / 2, Math.PI / 2); mkWall(BZ - FZ, RW, (FZ + BZ) / 2, -Math.PI / 2);
    // corner trim columns hide the seams
    for (const [x, z] of [[-RW, FZ], [RW, FZ], [-RW, BZ], [RW, BZ]]) mesh(bx(0.16, H, 0.16), col("#c9c0a6"), x, H / 2, z, S);
    // crown molding (stops at the corner columns)
    const crown = col("#d8d0b8");
    mesh(bx(RW * 2 - 0.16, 0.08, 0.05), crown, 0, H - 0.04, FZ + 0.025, S); mesh(bx(RW * 2 - 0.16, 0.08, 0.05), crown, 0, H - 0.04, BZ - 0.025, S);
    mesh(bx(0.05, 0.08, BZ - FZ - 0.16), crown, -RW + 0.025, H - 0.04, (FZ + BZ) / 2, S); mesh(bx(0.05, 0.08, BZ - FZ - 0.16), crown, RW - 0.025, H - 0.04, (FZ + BZ) / 2, S);

    // ---------- chalkboard
    this.boardT = canvasTex(512, 160, () => {});
    const frameM = lit({ map: this.woodT });
    const slate = col("#24382c");
    const boardFace = lit({ map: this.boardT });
    mesh(new THREE.BoxGeometry(7, 2.05, 0.04, 8, 3, 1), [slate, slate, slate, slate, boardFace, slate], 0, 1.75, FZ + 0.02, S);
    mesh(bx(7.16, 0.08, 0.07), frameM, 0, 1.75 + 1.065, FZ + 0.035, S);
    mesh(bx(7.16, 0.08, 0.07), frameM, 0, 1.75 - 1.065, FZ + 0.035, S);
    for (const sx of [-1, 1]) mesh(bx(0.08, 2.05, 0.07), frameM, sx * 3.54, 1.75, FZ + 0.035, S);
    mesh(bx(7.0, 0.035, 0.12), frameM, 0, 0.62, FZ + 0.06, S);
    for (const [x, c] of [[-2.2, "#f4f4ee"], [-2.05, "#f6e070"], [1.4, "#f4f4ee"]]) { const ch = mesh(cyl(0.008, 0.008, 0.08, 5), col(c), x, 0.646, FZ + 0.08, S); ch.rotation.z = Math.PI / 2; }
    mesh(bx(0.16, 0.035, 0.06), col("#3a3530"), 2.6, 0.655, FZ + 0.08, S);
    mesh(bx(0.15, 0.012, 0.055), col("#cfcfc8"), 2.6, 0.632, FZ + 0.08, S);
    // projector screen housing + speaker
    mesh(cyl(0.07, 0.07, 3.2, 8), col("#d8d8d8"), 0, 2.99, FZ + 0.14, S).rotation.z = Math.PI / 2;
    mesh(bx(0.4, 0.3, 0.16), col("#2c2c2c"), -5.4, 2.8, FZ + 0.08, S);
    this.setBoard(["Photosynthesis", "6CO2 + 6H2O + light -> C6H12O6 + 6O2", "chlorophyll = green!"]);

    // ---------- clock
    this.clockT = canvasTex(64, 64, () => {});
    const clock = new THREE.Group(); clock.position.set(4.6, 2.72, FZ + 0.03); S.add(clock);
    const rim = mesh(cyl(0.3, 0.3, 0.06, 16), col("#1c1c1c"), 0, 0, 0, clock); rim.rotation.x = Math.PI / 2;
    const face = mesh(new THREE.CircleGeometry(0.27, 16), flat({ map: this.clockT }), 0, 0, 0.045, clock);
    this.clock = face;
    this.setClock(12 * 60 + 60);

    // ---------- flag pole + bulletin board (front right)
    const cork = canvasTex(64, 48, (g) => {
      g.fillStyle = "#a87a4a"; g.fillRect(0, 0, 64, 48); noise(g, 64, 48, 30);
      const papers = [["#fff", 4, 4], ["#ffe880", 24, 6], ["#cfe8ff", 44, 3], ["#fff", 8, 26], ["#ffd0d0", 30, 25], ["#fff", 48, 24]];
      for (const [c, x, y] of papers) { g.fillStyle = c; g.fillRect(x, y, 14, 17); g.fillStyle = "#888"; for (let l = 0; l < 4; l++) g.fillRect(x + 2, y + 4 + l * 3, 10, 1); g.fillStyle = "#c22"; g.fillRect(x + 6, y, 2, 2); }
    });
    mesh(bx(0.04, 1.1, 1.6), frameM, RW - 0.02, 1.7, -7.8 + 3.2, S);
    const corkM = decal({ map: cork }); const cb = mesh(new THREE.PlaneGeometry(1.5, 1.0), corkM, RW - 0.045, 1.7, -4.6, S); cb.rotation.y = -Math.PI / 2;

    // ---------- teacher desk
    const td = new THREE.Group(); td.position.set(-4.3, 0, -6.6); S.add(td);
    mesh(bx(2.0, 0.06, 0.9), woodM, 0, 0.78, 0, td);
    mesh(bx(1.84, 0.72, 0.04), woodM, 0, 0.39, 0.41, td);
    for (const x of [-0.95, 0.95]) mesh(bx(0.06, 0.75, 0.86), woodM, x, 0.38, 0, td);
    for (let i = 0; i < 3; i++) mesh(bx(0.5, 0.18, 0.02), col("#a0743e"), 0.6, 0.6 - i * 0.22, -0.44, td);
    this.apple = mesh(sph(0.065, 8, 6), col("#b81818"), 0.6, 0.875, 0.1, td);
    mesh(cyl(0.006, 0.006, 0.04, 4), col("#4a2a10"), 0.6, 0.94, 0.1, td);
    const bookCols = ["#2a4a8a", "#8a2a2a", "#2a6a3a", "#c0a030"];
    bookCols.forEach((c, i) => mesh(bx(0.34, 0.05, 0.26), col(c), -0.55, 0.835 + i * 0.05, 0, td).rotation.y = i * 0.12);
    // globe
    const gT = canvasTex(32, 16, (g) => { g.fillStyle = "#3a6ab0"; g.fillRect(0, 0, 32, 16); g.fillStyle = "#5a9a4a"; [[3, 4, 7, 6], [13, 3, 6, 9], [22, 5, 7, 5], [26, 11, 4, 3]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h)); });
    mesh(cyl(0.06, 0.08, 0.03, 8), col("#5a4020"), 0.05, 0.825, 0.05, td);
    mesh(sph(0.13, 12, 8), lit({ map: gT }), 0.05, 1.0, 0.05, td);
    mesh(cyl(0.025, 0.02, 0.1, 6), col("#333"), -0.1, 0.86, 0.25, td);
    // her chair
    const tc = makeChair(col("#3a2a20"), true); tc.position.set(-4.3, 0, -7.4); tc.rotation.y = Math.PI; S.add(tc);
    this.teacherDesk = td;

    // ---------- windows (left wall) with frames, mullions and blinds
    this.windowT = canvasTex(64, 48, () => {});
    const winFrame = col("#ececec");
    for (const z of [-5, -1, 3]) {
      const w = mesh(new THREE.PlaneGeometry(2.4, 1.5), flat({ map: this.windowT }), -RW + 0.02, 1.85, z, S); w.rotation.y = Math.PI / 2;
      for (const dz of [-1.22, 1.22]) mesh(bx(0.08, 1.62, 0.06), winFrame, -RW + 0.04, 1.85, z + dz, S);
      for (const dy of [-0.79, 0.79]) mesh(bx(0.08, 0.06, 2.5), winFrame, -RW + 0.04, 1.85 + dy, z, S);
      mesh(bx(0.05, 1.5, 0.04), winFrame, -RW + 0.04, 1.85, z, S);
      mesh(bx(0.05, 0.04, 2.4), winFrame, -RW + 0.04, 1.85, z, S);
      mesh(bx(0.24, 0.05, 2.6), col("#d8d8d0"), -RW + 0.12, 1.04, z, S);
      // half-drawn blinds
      for (let i = 0; i < 6; i++) { const sl = mesh(bx(0.06, 0.012, 2.36), col("#e8e4d8"), -RW + 0.09, 2.56 - i * 0.05, z, S); sl.rotation.z = 0.5; }
      mesh(bx(0.08, 0.05, 2.4), col("#d0ccc0"), -RW + 0.09, 2.6, z, S);
    }
    this.setWindows("day");
    // radiator under the windows
    for (const z of [-5, -1, 3]) for (let i = 0; i < 10; i++) mesh(bx(0.12, 0.5, 0.05), col("#b8b0a0"), -RW + 0.12, 0.4, z - 0.9 + i * 0.2, S);
    // plant
    mesh(cyl(0.16, 0.12, 0.3, 8), col("#a0522d"), -6.4, 0.15, 5.9, S);
    for (let i = 0; i < 7; i++) { const l = mesh(geoLeaf(), col(i % 2 ? "#3a7a3a" : "#2e6a30"), -6.4, 0.45, 5.9, S); l.rotation.set(rand(-0.6, 0.6), i, rand(-0.6, 0.6)); }

    // ---------- door with frame, window, handle, kick plate
    mesh(bx(0.1, 2.35, 0.12), col("#6a5a48"), RW - 0.05, 1.17, -7.24, S);
    mesh(bx(0.1, 2.35, 0.12), col("#6a5a48"), RW - 0.05, 1.17, -6.16, S);
    mesh(bx(0.1, 0.12, 1.2), col("#6a5a48"), RW - 0.05, 2.3, -6.7, S);
    const doorPivot = new THREE.Group(); doorPivot.position.set(RW - 0.04, 0, -7.18);
    mesh(bx(0.05, 2.2, 0.96), woodM, 0, 1.1, 0.48, doorPivot);
    mesh(bx(0.06, 0.45, 0.25), flat({ color: 0x1a2430 }), 0, 1.6, 0.48, doorPivot);
    mesh(bx(0.06, 0.25, 0.9), col("#9a9a9a"), 0, 0.15, 0.48, doorPivot);
    const handle = mesh(bx(0.05, 0.03, 0.14), col("#c0c0c0"), -0.05, 1.05, 0.84, doorPivot);
    S.add(doorPivot); this.door = doorPivot;
    this.mutables.push({ kind: "door", obj: doorPivot, pos: new THREE.Vector3(RW - 0.1, 1.1, -6.7) });

    // ---------- posters (right wall)
    this.posters = [];
    const posterDefs = [
      { z: -2.6, normal: (g, w, h) => this.posterText(g, w, h, "#2a5aa8", "READ", "every day!"), creepy: (g, w, h) => this.posterText(g, w, h, "#200", "LOOK", "at me", true) },
      { z: 0.2, normal: (g, w, h) => this.posterCat(g, w, h, false), creepy: (g, w, h) => this.posterCat(g, w, h, true) },
      { z: 3.0, normal: (g, w, h) => this.posterCell(g, w, h, false), creepy: (g, w, h) => this.posterCell(g, w, h, true) },
    ];
    for (const p of posterDefs) {
      const tN = canvasTex(64, 88, p.normal), tC = canvasTex(64, 88, p.creepy);
      const m = mesh(new THREE.PlaneGeometry(1.0, 1.38), decal({ map: tN }), RW - 0.03, 1.8, p.z, S); m.rotation.y = -Math.PI / 2;
      const rec = { kind: "poster", obj: m, tN, tC, pos: m.position.clone(), creepy: false };
      this.posters.push(rec); this.mutables.push(rec);
    }
    // photo wall (back wall)
    this.photoGroup = new THREE.Group(); S.add(this.photoGroup);

    // ---------- back wall: bookshelf, cubbies, trash
    const shelf = new THREE.Group(); shelf.position.set(-3.6, 0, BZ - 0.25); S.add(shelf);
    mesh(bx(3.0, 1.2, 0.4), woodM, 0, 0.6, 0, shelf);
    const inner = col("#3a2a1a");
    for (const y of [0.32, 0.78]) mesh(bx(2.9, 0.38, 0.36), inner, 0, y, -0.03, shelf);
    const bc = ["#8a2a2a", "#2a4a8a", "#2a6a3a", "#c0a030", "#6a3a8a", "#d06a2a", "#3a8a8a", "#e0e0d0"];
    for (const y of [0.15, 0.61]) { let x = -1.4; while (x < 1.35) { const w = 0.04 + Math.random() * 0.05, h = 0.22 + Math.random() * 0.12; mesh(bx(w, h, 0.26), col(bc[Math.floor(Math.random() * bc.length)]), x + w / 2, y + h / 2, -0.06, shelf); x += w + 0.005; } }
    mesh(cyl(0.2, 0.17, 0.48, 8), col("#3a5a3a"), -6.4, 0.24, -7.7, S);
    mesh(cyl(0.2, 0.17, 0.48, 8), col("#2a4a6a"), 6.4, 0.24, BZ - 0.4, S);

    // ---------- ceiling lights (fixtures with diffusers)
    const diffT = canvasTex(32, 16, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 32, 16); g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < 32; i += 4) g.fillRect(i, 0, 1, 16); for (let j = 0; j < 16; j += 4) g.fillRect(0, j, 32, 1); });
    for (const x of [-3, 3]) for (const z of [-5.5, -1, 3.5]) {
      mesh(bx(1.3, 0.08, 0.62), col("#cfcfc8"), x, H - 0.04, z, S);
      const p = mesh(new THREE.PlaneGeometry(1.2, 0.52), flat({ map: diffT, color: 0xffffff }), x, H - 0.085, z, S); p.rotation.x = Math.PI / 2;
      this.lightPanels.push(p);
    }
    this.amb = new THREE.AmbientLight(0xfff4e0, 0.5); S.add(this.amb);
    this.hemi = new THREE.HemisphereLight(0xfffbe8, 0x6a5a40, 0.85); S.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe2b0, 1.0); this.sun.position.set(-10, 6, 2); S.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xe8f0ff, 0.35); this.fill.position.set(6, 8, 8); S.add(this.fill);
    this.redLight = new THREE.PointLight(0xff1010, 0, 14, 1.5); this.redLight.position.set(0, 2.8, -7); S.add(this.redLight);
    this.lightLevel = 1;

    // ---------- desks + chairs
    this.desks = []; this.chairs = [];
    const plastic = [col("#2f5a96"), col("#2a4e84")];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      const x = COLS[c], z = ROWS[r];
      const d = makeDesk(woodM); d.position.set(x, 0, z); S.add(d);
      this.desks.push({ c, r, obj: d });
      const ch = makeChair(plastic[(c + r) % 2]); ch.position.set(x, 0, z + 0.55); S.add(ch);
      this.chairs.push({ kind: "chair", obj: ch, home: ch.position.clone(), pos: ch.position, c, r });
    }
    // backpacks
    const bpCols = ["#c23b3b", "#2a2a2a", "#3b6fc2", "#e08a3a", "#5a2a6a", "#2f8f4f"];
    [[0, 0], [1, 1], [3, 0], [2, 1], [0, 2], [3, 2], [1, 3]].forEach(([c, r], i) => { const b = makeBackpack(bpCols[i % bpCols.length]); b.position.set(COLS[c] + 0.62, 0, ROWS[r] + 0.45); b.rotation.y = rand(-0.5, 0.5); S.add(b); });
    // rolling chairs at the back (they move)
    this.rollers = [];
    for (const [x, z] of [[5.8, 5.9], [-1.2, 6.1], [0.9, 6.0]]) {
      const ch = makeChair(col("#4a4a52"), true); ch.position.set(x, 0, z); ch.rotation.y = Math.random() * 6; S.add(ch);
      const rec = { kind: "roller", obj: ch, home: ch.position.clone(), homeRot: ch.rotation.y, pos: ch.position };
      this.rollers.push(rec); this.mutables.push(rec);
    }

    // ---------- rulers & pencils on desks (they turn toward you)
    this.rulers = [];
    const rulerT = canvasTex(64, 8, (g) => { g.fillStyle = "#e8d040"; g.fillRect(0, 0, 64, 8); g.fillStyle = "#222"; for (let i = 0; i < 64; i += 2) g.fillRect(i, 0, 1, i % 8 ? 2 : 4); });
    const rulerM = lit({ map: rulerT }), pencilM = col("#f0a020");
    for (const [c, r, kind] of [[2, 1, "ruler"], [1, 2, "pencil"], [3, 2, "ruler"], [1, 1, "pencil"], [3, 1, "ruler"], [2, 0, "pencil"], [0, 2, "ruler"], [2, 3, "ruler"]]) {
      const m = kind === "ruler" ? mesh(bx(0.3, 0.008, 0.035), rulerM) : mesh(bx(0.17, 0.014, 0.014), pencilM);
      m.position.set(COLS[c] + rand(-0.3, 0.3), 0.766, ROWS[r] + rand(-0.15, 0.15)); m.rotation.y = Math.random() * 3;
      S.add(m);
      const rec = { kind: "ruler", obj: m, home: m.position.clone(), homeRot: m.rotation.y, pos: m.position, step: 0 };
      this.rulers.push(rec); this.mutables.push(rec);
    }
    // paper sheets on desks
    const paperT = canvasTex(16, 20, (g) => { g.fillStyle = "#f4f2ea"; g.fillRect(0, 0, 16, 20); g.fillStyle = "#9ab"; for (let i = 3; i < 20; i += 2) g.fillRect(0, i, 16, 1); g.fillStyle = "#555"; for (let i = 4; i < 16; i += 2) g.fillRect(2, i, 6 + Math.random() * 6, 1); });
    for (const d of this.desks) { if (d.c === 2 && d.r === 2) continue; if (Math.random() < 0.6) { const p = mesh(new THREE.PlaneGeometry(0.22, 0.28), decal({ map: paperT }), COLS[d.c] + rand(-0.25, 0.25), 0.765, ROWS[d.r] + rand(-0.1, 0.1), this.scene); p.rotation.set(-Math.PI / 2, 0, rand(-0.4, 0.4)); } }

    // ---------- classmates
    this.students = [];
    for (const s of CLASSMATES) this.students.push(this.makeStudent(s));

    // ---------- player desk extras
    this.buildPlayerDesk();
  }

  makeStudent(s) {
    const m = makeSeated(s);
    const x = COLS[s.c], z = ROWS[s.r] + 0.5;
    m.root.position.set(x, 0, z); m.root.rotation.y = Math.PI; // face the board
    this.scene.add(m.root);
    const rec = { kind: "head", data: s, obj: m.root, head: m.head, model: m, pos: new THREE.Vector3(x, 1.18, z), turned: false, present: true };
    this.mutables.push(rec);
    return rec;
  }

  setMannequins(on) {
    const pale = col("#d6cec2"), pale2 = col("#bdb5a8");
    for (const s of this.students) {
      const m = s.model;
      for (const k of m.parts.skin) k.material = on ? pale : m.mats.skin;
      for (const k of m.parts.cloth) k.material = on ? pale2 : m.mats.shirt;
      for (const k of m.parts.pants) k.material = on ? pale2 : m.mats.pants;
      for (const k of m.parts.hair) k.visible = !on;
      m.faceM.map = on ? m.blank : m.tex; m.faceM.needsUpdate = true;
    }
  }

  setPresent(names) {
    for (const s of this.students) { s.present = names.includes(s.data.name); s.obj.visible = s.present; s.head.rotation.y = 0; s.turned = false; }
  }

  buildPlayerDesk() {
    const S = this.scene;
    const x = PLAYER_POS.x, z = ROWS[2];
    this.laptop = new THREE.Group();
    const baseM = col("#9aa0a8"), darkM = col("#2a2a2e");
    const deckT = canvasTex(128, 84, (g) => {
      g.fillStyle = "#9aa0a8"; g.fillRect(0, 0, 128, 84);
      g.fillStyle = "#1e1e22"; g.fillRect(8, 6, 112, 42);
      g.fillStyle = "#3c3c44"; for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) g.fillRect(10 + c * 7.8, 8 + r * 7.6, 6.4, 6.2);
      g.fillStyle = "#3c3c44"; g.fillRect(36, 46, 52, 0);
      g.fillStyle = "#8a9098"; g.fillRect(44, 54, 40, 24); g.fillStyle = "#7e848c"; g.fillRect(44, 77, 40, 1);
      noise(g, 128, 84, 5);
    });
    mesh(bx(0.46, 0.02, 0.3), [baseM, baseM, lit({ map: deckT }), baseM, baseM, baseM], 0, 0.01, 0, this.laptop);
    this.lid = new THREE.Group(); this.lid.position.set(0, 0.02, -0.15);
    const bezelT = canvasTex(32, 20, (g) => { g.fillStyle = "#1a1a1e"; g.fillRect(0, 0, 32, 20); g.fillStyle = "#333"; g.fillRect(15, 0, 2, 1); });
    mesh(bx(0.46, 0.3, 0.012), [baseM, baseM, baseM, baseM, lit({ map: bezelT }), baseM], 0, 0.15, -0.006, this.lid);
    this.screenCanvas = document.createElement("canvas"); this.screenCanvas.width = 256; this.screenCanvas.height = 160;
    this.screenT = new THREE.CanvasTexture(this.screenCanvas);
    this.screenT.magFilter = THREE.NearestFilter; this.screenT.minFilter = THREE.NearestFilter; this.screenT.generateMipmaps = false; this.screenT.colorSpace = THREE.SRGBColorSpace;
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.screenT });
    this.screenMat.polygonOffset = true; this.screenMat.polygonOffsetFactor = -2; this.screenMat.polygonOffsetUnits = -2;
    this.screen = mesh(new THREE.PlaneGeometry(0.43, 0.27), this.screenMat, 0, 0.15, 0.004, this.lid);
    this.laptop.add(this.lid);
    this.laptop.position.set(x, 0.76, z + 0.1);
    S.add(this.laptop);
    this.setLid(0.25);
    // stickers on the lid back
    const st = mesh(new THREE.CircleGeometry(0.04, 8), col("#e05090"), 0.1, 0.2, -0.016, this.lid); st.rotation.y = Math.PI;
    const st2 = mesh(new THREE.PlaneGeometry(0.07, 0.05), col("#50c0e0"), -0.12, 0.1, -0.016, this.lid); st2.rotation.set(0, Math.PI, 0.3);
    // book
    this.book = new THREE.Group();
    const pagesM = col("#efe8d8"), coverM = col("#8a1a1a");
    mesh(bx(0.36, 0.48, 0.04), [pagesM, coverM, pagesM, pagesM, coverM, coverM], 0, 0.24, 0, this.book);
    const label = mesh(new THREE.PlaneGeometry(0.26, 0.12), lit({ map: canvasTex(64, 32, (g) => { g.fillStyle = "#e8e0c0"; g.fillRect(0, 0, 64, 32); g.fillStyle = "#222"; g.font = "bold 12px monospace"; g.fillText("BIOLOGY", 5, 20); }) }), 0, 0.32, -0.025, this.book);
    label.rotation.y = Math.PI;
    this.bookHome = new THREE.Vector3(x - 0.34, 0.785, z - 0.02); this.bookRaised = new THREE.Vector3(x, 0.76, z - 0.2);
    this.bookUp = 0; this.setBook(0);
    S.add(this.book);
    // pencil case + water bottle
    mesh(bx(0.18, 0.04, 0.06), col("#3a6aa8"), x + 0.36, 0.78, z + 0.14, S).rotation.y = 0.3;
    mesh(cyl(0.03, 0.03, 0.2, 8), col("#60c0a0"), x + 0.4, 0.86, z - 0.2, S);
    mesh(cyl(0.022, 0.022, 0.03, 8), col("#222"), x + 0.4, 0.975, z - 0.2, S);
  }
  setLid(open) { this.lidOpen = open; this.lid.rotation.x = (Math.PI / 2) * (1 - open) - 0.22 * open; this.screen.visible = open > 0.3; }
  setBook(u) {
    this.bookUp = u;
    this.book.position.lerpVectors(this.bookHome, this.bookRaised, u);
    this.book.rotation.set(-(Math.PI / 2) * (1 - u) + 0.1 * u, 0.35 * (1 - u), 0);
    this.book.scale.setScalar(0.62 + 0.38 * u);
  }

  setBoard(lines, creepy = false) {
    const g = this.boardT.userData.g, w = 512, h = 160;
    g.fillStyle = "#2a4636"; g.fillRect(0, 0, w, h); noise(g, w, h, 8);
    g.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * w, Math.random() * h, 60 + Math.random() * 60, 10);
    g.fillStyle = creepy ? "#f0d6d6" : "#ecece4";
    lines.forEach((l, i) => { g.font = `${i === 0 ? "bold 26" : "18"}px "Comic Sans MS", "Chalkboard SE", cursive`; g.fillText(l, 24 + (creepy ? Math.random() * 12 : 0), 38 + i * 36); });
    this.boardT.needsUpdate = true;
  }
  boardScrawl(text) {
    const g = this.boardT.userData.g;
    g.fillStyle = "#f2e2e2"; g.font = 'bold 20px "Comic Sans MS", cursive';
    for (let i = 0; i < 4; i++) { g.save(); g.translate(30 + Math.random() * 340, 40 + Math.random() * 110); g.rotate((Math.random() - 0.5) * 0.4); g.fillText(text, 0, 0); g.restore(); }
    this.boardT.needsUpdate = true;
  }

  setClock(minutes) {
    const g = this.clockT.userData.g, s = 64, c = s / 2;
    g.fillStyle = "#f4f2ea"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#222"; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r = i % 5 ? 28 : 26; g.fillRect(c + Math.sin(a) * r - 0.5, c - Math.cos(a) * r - 0.5, i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
    g.font = "bold 7px sans-serif"; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), c + Math.sin(a) * 21 - 3, c - Math.cos(a) * 21 + 3); }
    const hr = (minutes / 60) % 12, mn = minutes % 60;
    const hand = (a, l, wdt, colr) => { g.strokeStyle = colr; g.lineWidth = wdt; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * l, c - Math.cos(a) * l); g.stroke(); };
    hand(hr / 12 * Math.PI * 2, 14, 3, "#111"); hand(mn / 60 * Math.PI * 2, 22, 2, "#111"); hand(((minutes * 60) % 60) / 60 * Math.PI * 2, 24, 1, "#c00");
    this.clockT.needsUpdate = true;
  }

  setWindows(mode) {
    const g = this.windowT.userData.g, w = 64, h = 48;
    if (mode === "day") {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#6aa8f8"); gr.addColorStop(1, "#d4ecff"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff"; [[8, 8, 18, 5], [12, 6, 8, 4], [38, 14, 16, 4], [42, 12, 7, 3]].forEach(([x, y, a, b]) => g.fillRect(x, y, a, b));
      g.fillStyle = "#5a9a4a"; g.fillRect(0, 38, w, 10); g.fillStyle = "#3a6a2a"; [[5, 26, 9, 13], [44, 28, 12, 11], [26, 32, 6, 7]].forEach(([x, y, a, b]) => g.fillRect(x, y, a, b));
      g.fillStyle = "#777"; g.fillRect(0, 44, w, 4);
    } else if (mode === "dusk") {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#4a2858"); gr.addColorStop(0.7, "#e07a3a"); gr.addColorStop(1, "#f0a060"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#1a1212"; g.fillRect(0, 38, w, 10); [[5, 26, 9, 13], [44, 28, 12, 11], [26, 32, 6, 7]].forEach(([x, y, a, b]) => g.fillRect(x, y, a, b));
    } else if (mode === "black") { g.fillStyle = "#030303"; g.fillRect(0, 0, w, h); }
    else if (mode === "red") { g.fillStyle = "#1a0202"; g.fillRect(0, 0, w, h); }
    else if (mode === "hands") {
      g.fillStyle = "#030303"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8b8a8";
      for (let i = 0; i < 5; i++) { const x = 4 + i * 12, y = 20 + (i % 2) * 6; g.fillRect(x, y, 7, 9); for (let f = 0; f < 4; f++) g.fillRect(x + f * 2, y - 6 + (f === 0 || f === 3 ? 2 : 0), 1, 6); }
    }
    this.windowT.needsUpdate = true;
    this.windowMode = mode;
  }

  setPhotos(list) {
    while (this.photoGroup.children.length) this.photoGroup.remove(this.photoGroup.children[0]);
    list.forEach((s, i) => {
      const t = canvasTex(40, 48, (g, w, h) => { g.fillStyle = "#e0ddd4"; g.fillRect(0, 0, w, h); g.fillStyle = "#8a9aaa"; g.fillRect(3, 3, w - 6, h - 14); g.save(); g.translate(8, 6); drawFace(g, w - 16, h - 20, { skin: s.skin, hair: s.hair, eyes: "scratch", mouth: "flat" }); g.restore(); g.fillStyle = "#222"; g.font = "bold 6px monospace"; g.fillText(s.name.toUpperCase(), 3, h - 3); });
      const m = mesh(new THREE.PlaneGeometry(0.45, 0.55), decal({ map: t }));
      const c = i % 8, row = Math.floor(i / 8);
      m.position.set(-0.6 + c * 0.75, 2.45 - row * 0.7, BZ - 0.03); m.rotation.y = Math.PI; m.rotation.z = (Math.random() - 0.5) * 0.15;
      this.photoGroup.add(m);
    });
  }

  setLights(level) {
    this.lightLevel = level;
    this.amb.intensity = 0.5 * level + 0.03;
    this.hemi.intensity = 0.85 * level;
    this.fill.intensity = 0.35 * level;
    this.sun.intensity = (this.windowMode === "day" ? 1.0 : this.windowMode === "dusk" ? 0.6 : 0) * level;
    for (const p of this.lightPanels) p.material.color.setScalar(level > 0.3 ? 0.45 + 0.55 * level : 0.12);
  }

  resetMutables() {
    for (const r of this.rollers) { r.obj.position.copy(r.home); r.obj.rotation.y = r.homeRot; }
    for (const r of this.rulers) { r.obj.position.copy(r.home); r.obj.rotation.y = r.homeRot; r.step = 0; }
    for (const ch of this.chairs) { ch.obj.position.copy(ch.home); ch.obj.rotation.y = 0; }
    for (const p of this.posters) { p.obj.material.map = p.tN; p.obj.material.needsUpdate = true; p.creepy = false; }
    for (const s of this.students) { s.head.rotation.y = 0; s.turned = false; }
    this.door.rotation.y = 0;
  }

  posterText(g, w, h, bg, big, small, creepy) {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle = creepy ? "#c01010" : "#fff"; g.font = "bold 18px sans-serif"; g.fillText(big, 6, 30);
    g.font = "11px sans-serif"; g.fillText(small, 6, 48);
    if (creepy) { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(32, 70, 14, 7, 0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(32, 70, 5, 0, 7); g.fill(); }
    else { g.fillStyle = "#ffd84a"; g.fillRect(36, 58, 20, 22); g.fillStyle = "#c22"; g.fillRect(36, 58, 4, 22); }
  }
  posterCat(g, w, h, creepy) {
    g.fillStyle = creepy ? "#0c0c0c" : "#6ab0e0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#6a5"; g.fillRect(30, 0, 3, 30);
    g.fillStyle = creepy ? "#ddd" : "#e89a3a"; g.fillRect(18, 28, 28, 24); g.fillRect(18, 20, 6, 8); g.fillRect(40, 20, 6, 8);
    g.fillRect(22, 50, 4, 10); g.fillRect(38, 50, 4, 10);
    if (!creepy) { g.fillStyle = "#000"; g.fillRect(24, 36, 4, 4); g.fillRect(36, 36, 4, 4); g.fillStyle = "#f8a"; g.fillRect(30, 42, 4, 3); }
    g.fillStyle = creepy ? "#c01010" : "#fff"; g.font = "bold 11px sans-serif"; g.fillText(creepy ? "LET GO" : "HANG IN", 8, 74); g.fillText(creepy ? "" : "THERE!", 12, 85);
  }
  posterCell(g, w, h, creepy) {
    g.fillStyle = creepy ? "#1a0a0a" : "#f0f0e4"; g.fillRect(0, 0, w, h);
    g.fillStyle = creepy ? "#7a1010" : "#7ac06a"; g.beginPath(); g.ellipse(32, 40, 26, 22, 0, 0, 7); g.fill();
    g.fillStyle = creepy ? "#fff" : "#3a8a3a"; g.beginPath(); g.ellipse(32, 40, 9, creepy ? 6 : 8, 0, 0, 7); g.fill();
    if (creepy) { g.fillStyle = "#000"; g.beginPath(); g.arc(32, 40, 3, 0, 7); g.fill(); }
    else { g.fillStyle = "#2a6a2a"; for (const [x, y] of [[18, 30], [44, 32], [20, 52], [42, 50]]) { g.beginPath(); g.ellipse(x, y, 5, 3, 0.5, 0, 7); g.fill(); } }
    g.fillStyle = creepy ? "#c01010" : "#223"; g.font = "bold 10px sans-serif"; g.fillText(creepy ? "IT SEES" : "THE CELL", 10, 78);
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }
let _leaf;
function geoLeaf() { return _leaf || (_leaf = new THREE.ConeGeometry(0.06, 0.5, 4)); }
