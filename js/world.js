// The classroom: room, desks, classmates, props, player desk, lights
import * as THREE from "three";
import { lit, flat, canvasTex, noise } from "./psx.js";

export const COLS = [-4.5, -1.5, 1.5, 4.5];
export const ROWS = [-3.2, -0.8, 1.6, 4.0];
export const PLAYER_SEAT = { c: 2, r: 2 };
export const PLAYER_POS = new THREE.Vector3(COLS[2], 1.14, ROWS[2] + 0.5);

export const CLASSMATES = [
  { name: "Tyler", c: 1, r: 1, skin: "#e0b48c", hair: "#5a3a1e", shirt: "#c23b3b" },
  { name: "Priya", c: 2, r: 1, skin: "#a8754f", hair: "#1b1110", shirt: "#3b6fc2" },
  { name: "Marcus", c: 3, r: 2, skin: "#6e4a2f", hair: "#120c08", shirt: "#e0c040" },
  { name: "Emma", c: 0, r: 2, skin: "#f1c9a5", hair: "#d8b25a", shirt: "#62a35a" },
  { name: "Jayden", c: 0, r: 0, skin: "#8d5b3c", hair: "#1a1a1a", shirt: "#7b4bb0" },
  { name: "Sophie", c: 1, r: 0, skin: "#f0c8a8", hair: "#8a3a1c", shirt: "#d86a9a" },
  { name: "Leo", c: 2, r: 0, skin: "#d9a77c", hair: "#2e2015", shirt: "#3aa0a0" },
  { name: "Ava", c: 3, r: 0, skin: "#c48a62", hair: "#3a2414", shirt: "#e08a3a" },
  { name: "Noah", c: 3, r: 1, skin: "#e6b996", hair: "#6b4a2a", shirt: "#4a4a8a" },
  { name: "Mia", c: 0, r: 1, skin: "#b57a52", hair: "#140d09", shirt: "#a0a0a0" },
  { name: "Sam", c: 1, r: 2, skin: "#e8bf9a", hair: "#3a2a1a", shirt: "#2f8f4f" },
  { name: "Owen", c: 1, r: 3, skin: "#d4a07a", hair: "#4a3020", shirt: "#8a5a3a" },
  { name: "Lily", c: 3, r: 3, skin: "#f3d0b0", hair: "#c06030", shirt: "#5a8ad8" },
];

export function drawFace(g, w, h, o = {}) {
  const skin = o.skin || "#e8c09a", hair = o.hair || "#3a2a1a";
  g.fillStyle = skin; g.fillRect(0, 0, w, h);
  g.fillStyle = hair; g.fillRect(0, 0, w, h * 0.22);
  if (o.long) { g.fillRect(0, 0, w * 0.12, h * 0.8); g.fillRect(w * 0.88, 0, w * 0.12, h * 0.8); }
  const ey = h * 0.42, ex1 = w * 0.3, ex2 = w * 0.7;
  const eye = o.eyes || "normal";
  if (eye === "none") {
    // blank mannequin
  } else if (eye === "scratch") {
    g.strokeStyle = "#200"; g.lineWidth = 2;
    for (const ex of [ex1, ex2]) for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(ex - 5 + Math.random() * 3, ey - 5); g.lineTo(ex + 5 - Math.random() * 3, ey + 5); g.stroke(); }
  } else if (eye === "black" || eye === "wide") {
    const r = eye === "wide" ? w * 0.13 : w * 0.11;
    g.fillStyle = eye === "wide" ? "#fff" : "#000";
    for (const ex of [ex1, ex2]) { g.beginPath(); g.ellipse(ex, ey, r, r * 1.2, 0, 0, 7); g.fill(); }
    g.fillStyle = "#000";
    if (eye === "wide") for (const ex of [ex1, ex2]) { g.beginPath(); g.arc(ex, ey, r * 0.28, 0, 7); g.fill(); }
  } else {
    g.fillStyle = "#fff"; g.fillRect(ex1 - w * 0.08, ey - h * 0.04, w * 0.16, h * 0.08); g.fillRect(ex2 - w * 0.08, ey - h * 0.04, w * 0.16, h * 0.08);
    g.fillStyle = "#222"; g.fillRect(ex1 - w * 0.03, ey - h * 0.04, w * 0.06, h * 0.08); g.fillRect(ex2 - w * 0.03, ey - h * 0.04, w * 0.06, h * 0.08);
    if (o.glasses) { g.strokeStyle = "#111"; g.lineWidth = 1; g.strokeRect(ex1 - w * 0.12, ey - h * 0.08, w * 0.24, h * 0.16); g.strokeRect(ex2 - w * 0.12, ey - h * 0.08, w * 0.24, h * 0.16); g.beginPath(); g.moveTo(ex1 + w * 0.12, ey); g.lineTo(ex2 - w * 0.12, ey); g.stroke(); }
  }
  const mouth = o.mouth || "flat";
  g.fillStyle = "#5a1a1a";
  if (mouth === "flat") g.fillRect(w * 0.38, h * 0.72, w * 0.24, h * 0.04);
  else if (mouth === "smile") { g.fillRect(w * 0.34, h * 0.7, w * 0.06, h * 0.04); g.fillRect(w * 0.6, h * 0.7, w * 0.06, h * 0.04); g.fillRect(w * 0.38, h * 0.73, w * 0.24, h * 0.04); }
  else if (mouth === "grin") {
    g.fillStyle = "#200"; g.fillRect(w * 0.15, h * 0.66, w * 0.7, h * 0.12);
    g.fillStyle = "#eee"; for (let i = 0; i < 9; i++) g.fillRect(w * 0.17 + i * w * 0.074, h * 0.66, w * 0.05, h * 0.05);
  } else if (mouth === "open") {
    g.fillStyle = "#000"; g.beginPath(); g.ellipse(w * 0.5, h * 0.74, w * 0.16, h * 0.2, 0, 0, 7); g.fill();
  }
  if (o.blood) { g.fillStyle = "#600"; for (const ex of [ex1, ex2]) g.fillRect(ex - 1, ey + 4, 2, h * 0.4); }
}

function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }

export class Classroom {
  constructor(scene) {
    this.scene = scene;
    this.mutables = [];
    this.lightPanels = [];
    this.build();
  }

  build() {
    const S = this.scene;
    // ---- textures
    const floorT = canvasTex(32, 32, (g) => {
      g.fillStyle = "#b8ad94"; g.fillRect(0, 0, 32, 32); g.fillStyle = "#9c917a"; g.fillRect(0, 0, 16, 16); g.fillRect(16, 16, 16, 16);
      noise(g, 32, 32, 14);
    }, [7, 8]);
    const wallT = canvasTex(32, 32, (g) => { g.fillStyle = "#d6d0b8"; g.fillRect(0, 0, 32, 32); g.fillStyle = "#c9c2a8"; for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1); noise(g, 32, 32, 10); }, [6, 2]);
    const trimT = canvasTex(16, 16, (g) => { g.fillStyle = "#6a8a7a"; g.fillRect(0, 0, 16, 16); noise(g, 16, 16, 12); }, [8, 1]);
    const ceilT = canvasTex(32, 32, (g) => { g.fillStyle = "#e8e4d8"; g.fillRect(0, 0, 32, 32); g.fillStyle = "#bdb8aa"; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32); noise(g, 32, 32, 20); }, [7, 8]);
    this.woodT = canvasTex(32, 16, (g) => { g.fillStyle = "#b07a44"; g.fillRect(0, 0, 32, 16); g.fillStyle = "#9a6636"; for (let y = 1; y < 16; y += 3) g.fillRect(0, y, 32, 1); noise(g, 32, 16, 16); });
    const metalM = lit({ color: 0x55585e });

    // ---- room shell (subdivided so affine warping stays subtle)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 16, 14, 16), lit({ map: floorT }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -1); S.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 16, 7, 8), lit({ map: ceilT }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, -1); S.add(ceil);
    const wallM = lit({ map: wallT });
    const mkWall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2, Math.ceil(w), 3), wallM); m.position.set(x, 1.6, z); m.rotation.y = ry; S.add(m); return m; };
    mkWall(14, 0, -9, 0); mkWall(14, 0, 7, Math.PI); mkWall(16, -7, -1, Math.PI / 2); mkWall(16, 7, -1, -Math.PI / 2);
    const trimM = lit({ map: trimT });
    const mkTrim = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9, Math.ceil(w), 1), trimM); m.position.set(x, 0.45, z); m.rotation.y = ry; S.add(m); };
    mkTrim(14, 0, -8.99, 0); mkTrim(14, 0, 6.99, Math.PI); mkTrim(16, -6.99, -1, Math.PI / 2); mkTrim(16, 6.99, -1, -Math.PI / 2);

    // ---- chalkboard
    this.boardT = canvasTex(256, 80, () => {});
    const frame = box(7.4, 2.4, 0.08, lit({ color: 0x7a5a36 })); frame.position.set(0, 1.75, -8.97); S.add(frame);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.1, 6, 2), lit({ map: this.boardT })); board.position.set(0, 1.75, -8.92); S.add(board);
    const tray = box(7, 0.05, 0.12, lit({ color: 0x7a5a36 })); tray.position.set(0, 0.68, -8.88); S.add(tray);
    this.setBoard(["Photosynthesis", "6CO2 + 6H2O + light -> C6H12O6 + 6O2", "chlorophyll = green!"]);

    // ---- clock
    this.clockT = canvasTex(48, 48, () => {});
    this.clock = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12), flat({ map: this.clockT }));
    this.clock.position.set(4.6, 2.75, -8.93); S.add(this.clock);
    this.setClock(60);

    // ---- flag-ish + speaker + projector screen roll
    const speaker = box(0.4, 0.3, 0.15, lit({ color: 0x333333 })); speaker.position.set(-4.6, 2.8, -8.9); S.add(speaker);

    // ---- teacher desk
    const tdesk = new THREE.Group();
    const tTop = box(2.0, 0.08, 0.9, lit({ map: this.woodT })); tTop.position.y = 0.78; tdesk.add(tTop);
    const tFront = box(2.0, 0.7, 0.05, lit({ map: this.woodT })); tFront.position.set(0, 0.4, 0.42); tdesk.add(tFront);
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), lit({ color: 0xc01818 })); apple.position.set(0.6, 0.88, 0); tdesk.add(apple);
    this.apple = apple;
    const books = box(0.4, 0.15, 0.3, lit({ color: 0x2a4a8a })); books.position.set(-0.5, 0.9, 0); tdesk.add(books);
    tdesk.position.set(-4.3, 0, -6.6); S.add(tdesk);
    this.teacherDesk = tdesk;

    // ---- windows (left wall)
    this.windowT = canvasTex(32, 24, () => {});
    this.windowMats = [];
    for (const z of [-5, -1, 3]) {
      const m = flat({ map: this.windowT }); this.windowMats.push(m);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), m); w.position.set(-6.97, 1.85, z); w.rotation.y = Math.PI / 2; S.add(w);
      const fr = box(0.06, 1.6, 0.08, lit({ color: 0xeeeeee })); fr.position.set(-6.94, 1.85, z); S.add(fr);
      const sill = box(0.2, 0.06, 2.6, lit({ color: 0xdddddd })); sill.position.set(-6.9, 1.07, z); S.add(sill);
    }
    this.setWindows("day");

    // ---- door (right wall, front) with pivot
    const doorPivot = new THREE.Group(); doorPivot.position.set(6.97, 0, -7.2);
    const door = box(0.06, 2.2, 1.0, lit({ map: this.woodT })); door.position.set(0, 1.1, 0.5); doorPivot.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), metalM); knob.position.set(-0.06, 1.05, 0.9); doorPivot.add(knob);
    const dwin = box(0.07, 0.5, 0.3, flat({ color: 0x223040 })); dwin.position.set(0, 1.6, 0.5); doorPivot.add(dwin);
    this.doorWin = dwin;
    S.add(doorPivot); this.door = doorPivot;
    this.mutables.push({ kind: "door", obj: doorPivot, pos: new THREE.Vector3(6.9, 1.1, -6.7) });

    // ---- posters (right wall)
    this.posters = [];
    const posterDefs = [
      { z: -3.5, normal: (g, w, h) => this.posterText(g, w, h, "#2a5aa8", "READ", "every day!"), creepy: (g, w, h) => this.posterText(g, w, h, "#200", "LOOK", "at me", true) },
      { z: -0.5, normal: (g, w, h) => this.posterCat(g, w, h, false), creepy: (g, w, h) => this.posterCat(g, w, h, true) },
      { z: 2.5, normal: (g, w, h) => this.posterText(g, w, h, "#2a8a4a", "SCIENCE", "is fun :)"), creepy: (g, w, h) => this.posterText(g, w, h, "#300", "EYES", "UP FRONT", true) },
    ];
    for (const p of posterDefs) {
      const tN = canvasTex(32, 44, p.normal), tC = canvasTex(32, 44, p.creepy);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), lit({ map: tN }));
      m.position.set(6.96, 1.8, p.z); m.rotation.y = -Math.PI / 2; S.add(m);
      const rec = { kind: "poster", obj: m, tN, tC, pos: m.position.clone(), creepy: false };
      this.posters.push(rec); this.mutables.push(rec);
    }

    // ---- photo wall (back wall) - hidden until later days
    this.photoGroup = new THREE.Group(); S.add(this.photoGroup);

    // ---- cubbies / shelf on back wall
    const shelf = box(5, 1.0, 0.5, lit({ map: this.woodT })); shelf.position.set(-3, 0.5, 6.7); S.add(shelf);
    const trash = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 6), lit({ color: 0x406040 })); trash.position.set(-6.4, 0.23, -7.6); S.add(trash);

    // ---- ceiling lights
    for (const x of [-3, 3]) for (const z of [-5, -0.5, 4]) {
      const p = box(1.2, 0.05, 0.5, flat({ color: 0xffffff })); p.position.set(x, 3.17, z); S.add(p); this.lightPanels.push(p);
    }
    this.amb = new THREE.AmbientLight(0xfff4e0, 0.55); S.add(this.amb);
    this.hemi = new THREE.HemisphereLight(0xfffbe8, 0x6a5a40, 0.9); S.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe2b0, 1.0); this.sun.position.set(-10, 6, 2); S.add(this.sun);
    this.redLight = new THREE.PointLight(0xff1010, 0, 14, 1.5); this.redLight.position.set(0, 2.8, -7); S.add(this.redLight);
    this.lightLevel = 1;

    // ---- desks, chairs
    this.desks = []; this.chairs = [];
    const deskTopM = lit({ map: this.woodT }), legM = metalM, chairM = lit({ color: 0x3a5a8a }), seatM = lit({ color: 0x2f4a72 });
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      const x = COLS[c], z = ROWS[r];
      const d = new THREE.Group();
      const top = box(1.1, 0.05, 0.65, deskTopM); top.position.y = 0.74; d.add(top);
      for (const [lx, lz] of [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]]) { const l = box(0.04, 0.72, 0.04, legM); l.position.set(lx, 0.36, lz); d.add(l); }
      d.position.set(x, 0, z); S.add(d);
      this.desks.push({ c, r, obj: d });
      const ch = this.makeChair(chairM, seatM); ch.position.set(x, 0, z + 0.55); S.add(ch);
      const rec = { kind: "chair", obj: ch, home: ch.position.clone(), pos: ch.position, c, r };
      this.chairs.push(rec);
    }
    // extra rolling chairs at the back
    this.rollers = [];
    for (const [x, z] of [[5.8, 5.8], [-5.6, 5.6], [0, 6.2]]) {
      const ch = this.makeChair(chairM, seatM, true); ch.position.set(x, 0, z); ch.rotation.y = Math.random() * 6; S.add(ch);
      const rec = { kind: "roller", obj: ch, home: ch.position.clone(), homeRot: ch.rotation.y, pos: ch.position };
      this.rollers.push(rec); this.mutables.push(rec);
    }

    // ---- rulers & pencils on desks (mutables)
    this.rulers = [];
    const rulerM = lit({ color: 0xe8d040 }), pencilM = lit({ color: 0xf0a020 });
    for (const [c, r, kind] of [[2, 1, "ruler"], [1, 2, "pencil"], [3, 2, "ruler"], [1, 1, "pencil"], [3, 1, "ruler"], [2, 0, "pencil"], [0, 2, "ruler"]]) {
      const m = kind === "ruler" ? box(0.32, 0.01, 0.035, rulerM) : box(0.18, 0.015, 0.015, pencilM);
      const x = COLS[c] + (Math.random() - 0.5) * 0.5, z = ROWS[r] + (Math.random() - 0.5) * 0.3;
      m.position.set(x, 0.775, z); m.rotation.y = Math.random() * 3;
      this.scene.add(m);
      const rec = { kind: "ruler", obj: m, home: m.position.clone(), homeRot: m.rotation.y, pos: m.position, step: 0 };
      this.rulers.push(rec); this.mutables.push(rec);
    }

    // ---- classmates
    this.students = [];
    for (const s of CLASSMATES) this.students.push(this.makeStudent(s));

    // ---- player desk extras: laptop + book
    this.buildPlayerDesk();
  }

  makeChair(frameM, seatM, rolling = false) {
    const g = new THREE.Group();
    const seat = box(0.45, 0.05, 0.42, seatM); seat.position.y = 0.45; g.add(seat);
    const back = box(0.45, 0.4, 0.04, frameM); back.position.set(0, 0.75, 0.2); g.add(back);
    const post = box(0.04, 0.42, 0.04, frameM); post.position.set(0, 0.23, 0); g.add(post);
    if (rolling) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = box(0.3, 0.03, 0.03, frameM); leg.position.set(Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15); leg.rotation.y = -a; g.add(leg); }
    else { const base = box(0.4, 0.03, 0.4, frameM); base.position.y = 0.03; g.add(base); }
    return g;
  }

  makeStudent(s) {
    const g = new THREE.Group();
    const shirt = lit({ color: new THREE.Color(s.shirt) });
    const torso = box(0.42, 0.5, 0.24, shirt); torso.position.y = 0.76; g.add(torso);
    const legs = box(0.38, 0.14, 0.45, lit({ color: 0x2a3550 })); legs.position.set(0, 0.52, -0.15); g.add(legs);
    for (const sx of [-0.25, 0.25]) { const arm = box(0.11, 0.11, 0.42, shirt); arm.position.set(sx, 0.82, -0.2); g.add(arm); }
    const faceT = canvasTex(24, 24, (gg, w, h) => drawFace(gg, w, h, { skin: s.skin, hair: s.hair, long: /Emma|Priya|Sophie|Ava|Mia|Lily/.test(s.name) }));
    const blankT = canvasTex(24, 24, (gg, w, h) => drawFace(gg, w, h, { skin: "#d8d0c4", hair: "#d8d0c4", eyes: "none", mouth: "none" }));
    const hairM = lit({ color: new THREE.Color(s.hair) }), skinM = lit({ color: new THREE.Color(s.skin) });
    const faceM = lit({ map: faceT });
    const head = box(0.26, 0.28, 0.26, [skinM, skinM, hairM, skinM, faceM, hairM]);
    head.position.y = 1.16; g.add(head);
    const x = COLS[s.c], z = ROWS[s.r] + 0.5;
    g.position.set(x, 0, z); g.rotation.y = Math.PI; // face the board (-z)
    this.scene.add(g);
    const rec = { kind: "head", data: s, obj: g, head, torso, faceM, faceT, blankT, skinM, hairM, shirt, pos: new THREE.Vector3(x, 1.16, z), turned: false, present: true };
    this.mutables.push(rec);
    return rec;
  }

  setMannequins(on) {
    for (const s of this.students) {
      const m = s.head.material;
      if (on) {
        const pale = lit({ color: 0xd8d0c4 });
        s.head.material = [pale, pale, pale, pale, lit({ map: s.blankT }), pale];
        s.torso.material = lit({ color: 0xbab2a6 });
      } else {
        s.head.material = [s.skinM, s.skinM, s.hairM, s.skinM, s.faceM, s.hairM];
        s.torso.material = s.shirt;
      }
    }
  }

  setPresent(names) {
    for (const s of this.students) { s.present = names.includes(s.data.name); s.obj.visible = s.present; s.head.rotation.y = 0; s.turned = false; }
  }

  buildPlayerDesk() {
    const S = this.scene;
    const x = PLAYER_POS.x, z = ROWS[2];
    // laptop
    this.laptop = new THREE.Group();
    const baseM = lit({ color: 0x8a8f98 });
    const base = box(0.46, 0.02, 0.3, baseM); base.position.y = 0.01; this.laptop.add(base);
    const keys = box(0.4, 0.004, 0.15, lit({ color: 0x2a2a2e })); keys.position.set(0, 0.022, -0.02); this.laptop.add(keys);
    this.lid = new THREE.Group(); this.lid.position.set(0, 0.02, -0.15);
    const lidBack = box(0.46, 0.3, 0.012, baseM); lidBack.position.set(0, 0.15, -0.007); this.lid.add(lidBack);
    this.screenCanvas = document.createElement("canvas"); this.screenCanvas.width = 256; this.screenCanvas.height = 160;
    this.screenT = new THREE.CanvasTexture(this.screenCanvas);
    this.screenT.magFilter = THREE.NearestFilter; this.screenT.minFilter = THREE.NearestFilter; this.screenT.generateMipmaps = false; this.screenT.colorSpace = THREE.SRGBColorSpace;
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.screenT });
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.27), this.screenMat); this.screen.position.set(0, 0.15, 0.0); this.lid.add(this.screen);
    this.laptop.add(this.lid);
    this.laptop.position.set(x, 0.77, z + 0.1);
    S.add(this.laptop);
    this.setLid(0.25);
    // book
    this.book = new THREE.Group();
    const cover = box(0.36, 0.48, 0.04, lit({ color: 0x8a1a1a })); cover.position.y = 0.24; this.book.add(cover);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), lit({ map: canvasTex(32, 16, (g) => { g.fillStyle = "#e8e0c0"; g.fillRect(0, 0, 32, 16); g.fillStyle = "#222"; g.font = "bold 6px monospace"; g.fillText("BIOLOGY", 3, 10); }) }));
    label.position.set(0, 0.32, -0.025); label.rotation.y = Math.PI; this.book.add(label);
    this.book.position.set(x, 0.77, z - 0.18);
    this.bookUp = 0; this.setBook(0);
    S.add(this.book);
  }
  setLid(open) { this.lidOpen = open; this.lid.rotation.x = (Math.PI / 2) * (1 - open) - 0.22 * open; this.screen.visible = open > 0.3; }
  setBook(u) { this.bookUp = u; this.book.rotation.x = -(Math.PI / 2) * (1 - u) + 0.1 * u; this.book.position.y = 0.77 + 0.02 * (1 - u); }

  setBoard(lines, creepy = false) {
    const g = this.boardT.userData.g, w = 256, h = 80;
    g.fillStyle = "#2c4a38"; g.fillRect(0, 0, w, h); noise(g, w, h, 10);
    g.fillStyle = "rgba(255,255,255,0.07)"; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * w, Math.random() * h, 40, 6);
    g.fillStyle = creepy ? "#f0d0d0" : "#eeeeea";
    lines.forEach((l, i) => { g.font = `${i === 0 ? "bold 12" : "9"}px monospace`; g.fillText(l, 10 + (creepy ? Math.random() * 6 : 0), 18 + i * 17); });
    this.boardT.needsUpdate = true;
  }
  boardScrawl(text) {
    const g = this.boardT.userData.g;
    g.fillStyle = "#f2e8e8"; g.font = "bold 10px monospace";
    for (let i = 0; i < 4; i++) { g.save(); g.translate(20 + Math.random() * 180, 20 + Math.random() * 55); g.rotate((Math.random() - 0.5) * 0.4); g.fillText(text, 0, 0); g.restore(); }
    this.boardT.needsUpdate = true;
  }

  setClock(minutes) {
    const g = this.clockT.userData.g, s = 48, c = s / 2;
    g.fillStyle = "#111"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#f2f0e8"; g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.fill();
    g.fillStyle = "#222"; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(c + Math.sin(a) * 18 - 1, c - Math.cos(a) * 18 - 1, 2, 2); }
    const hr = (minutes / 60) % 12, mn = minutes % 60;
    const hand = (a, l, wdt) => { g.strokeStyle = "#111"; g.lineWidth = wdt; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * l, c - Math.cos(a) * l); g.stroke(); };
    hand(hr / 12 * Math.PI * 2, 11, 3); hand(mn / 60 * Math.PI * 2, 17, 2);
    this.clockT.needsUpdate = true;
  }

  setWindows(mode) {
    const g = this.windowT.userData.g, w = 32, h = 24;
    if (mode === "day") { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#7ab4ff"); gr.addColorStop(1, "#cde6ff"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.fillRect(4, 5, 9, 3); g.fillRect(18, 9, 8, 2); g.fillStyle = "#4a8a3a"; g.fillRect(0, 19, w, 5); g.fillStyle = "#3a6a2a"; g.fillRect(3, 14, 5, 6); g.fillRect(22, 15, 6, 5); }
    else if (mode === "dusk") { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5a3060"); gr.addColorStop(1, "#e07a3a"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#201818"; g.fillRect(0, 19, w, 5); g.fillRect(3, 13, 5, 7); g.fillRect(22, 14, 6, 6); }
    else if (mode === "black") { g.fillStyle = "#030303"; g.fillRect(0, 0, w, h); }
    else if (mode === "red") { g.fillStyle = "#1a0202"; g.fillRect(0, 0, w, h); g.fillStyle = "#500"; g.fillRect(14, 4, 4, 4); }
    else if (mode === "hands") { g.fillStyle = "#030303"; g.fillRect(0, 0, w, h); g.fillStyle = "#d8c8b8"; for (let i = 0; i < 4; i++) { const x = 3 + i * 7; g.fillRect(x, 10, 4, 6); g.fillRect(x, 6, 1, 4); g.fillRect(x + 1, 5, 1, 5); g.fillRect(x + 2, 5, 1, 5); g.fillRect(x + 3, 6, 1, 4); } }
    this.windowT.needsUpdate = true;
    this.windowMode = mode;
  }

  setPhotos(list) {
    // list of classmates (records) whose photos appear on the back wall
    while (this.photoGroup.children.length) this.photoGroup.remove(this.photoGroup.children[0]);
    list.forEach((s, i) => {
      const t = canvasTex(20, 24, (g, w, h) => { g.fillStyle = "#ddd"; g.fillRect(0, 0, w, h); g.save(); g.translate(2, 2); drawFace(g, w - 4, h - 7, { skin: s.skin, hair: s.hair, eyes: "scratch", mouth: "flat" }); g.restore(); g.fillStyle = "#222"; g.font = "4px monospace"; g.fillText(s.name.toUpperCase(), 2, h - 1); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.55), lit({ map: t }));
      const col = i % 8, row = Math.floor(i / 8);
      m.position.set(-2.6 + col * 0.75, 2.4 - row * 0.7, 6.96); m.rotation.y = Math.PI; m.rotation.z = (Math.random() - 0.5) * 0.15;
      this.photoGroup.add(m);
    });
  }

  setLights(level) {
    this.lightLevel = level;
    this.amb.intensity = 0.55 * level + 0.03;
    this.hemi.intensity = 0.9 * level;
    this.sun.intensity = (this.windowMode === "day" ? 1.0 : this.windowMode === "dusk" ? 0.6 : 0) * level;
    for (const p of this.lightPanels) p.material.color.setScalar(level > 0.3 ? 0.4 + 0.6 * level : 0.15);
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
    g.fillStyle = creepy ? "#c01010" : "#fff"; g.font = "bold 9px monospace"; g.fillText(big, 2, 18);
    g.font = "6px monospace"; g.fillText(small, 2, 30);
    if (creepy) { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(16, 38, 6, 3, 0, 0, 7); g.fill(); g.fillStyle = "#000"; g.fillRect(15, 36, 3, 4); }
    else { g.fillStyle = "#ffd84a"; g.fillRect(20, 34, 8, 8); }
  }
  posterCat(g, w, h, creepy) {
    g.fillStyle = creepy ? "#111" : "#6ab0e0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#8a6"; g.fillRect(14, 2, 2, 14);
    g.fillStyle = creepy ? "#ddd" : "#e89a3a"; g.fillRect(9, 14, 14, 12); g.fillRect(9, 10, 3, 4); g.fillRect(20, 10, 3, 4);
    if (!creepy) { g.fillStyle = "#000"; g.fillRect(12, 18, 2, 2); g.fillRect(18, 18, 2, 2); }
    g.fillStyle = creepy ? "#c01010" : "#fff"; g.font = "bold 5px monospace"; g.fillText(creepy ? "LET GO" : "HANG IN", 4, 34); g.fillText(creepy ? "" : "THERE!", 6, 40);
  }
}
