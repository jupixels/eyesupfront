// Mrs. Halloway: body, vision cone, patrol/watch AI, stalking
import * as THREE from "three";
import { lit, flat, canvasTex } from "./psx.js";
import { PLAYER_POS } from "./world.js";
import { makeTeacherBody, headTex } from "./models.js";

const BOARD_Z = -7.6;
const FRONT_Z = -5.2;
const AISLES = [-3, 0, 3];
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };


export class Teacher {
  constructor(scene, audio) {
    this.scene = scene; this.audio = audio;
    const base = { skin: "#e6c6a4", hair: "#77777c", brow: "#5a5a5e", iris: "#3a4a5a" };
    this.faces = {
      normal: headTex({ ...base, mouth: "flat" }),
      smile: headTex({ ...base, mouth: "smile" }),
      wrong: headTex({ ...base, skin: "#d8c4ae", eyes: "wide", mouth: "grin" }),
      monster: headTex({ ...base, skin: "#c4b4a4", hair: "#3a3a40", eyes: "black", mouth: "open", blood: true }),
      grin: headTex({ ...base, skin: "#c4b4a4", hair: "#3a3a40", eyes: "black", mouth: "grin" }),
    };
    this.build();
    this.buildCone();
    this.reset({});
  }

  build() {
    const b = makeTeacherBody(this.faces.normal);
    Object.assign(this, { group: b.group, body: b.body, arms: b.arms, legs: b.legs, neck: b.neck, neckMesh: b.neckMesh, headPivot: b.headPivot, head: b.head, faceMat: b.faceMat });
    this.scene.add(this.group);
    // eye glints (visible in the dark on late days)
    this.eyeGlow = new THREE.Group();
    for (const x of [-0.042, 0.042]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2020 })); e.position.set(x, 0.13, 0.13); this.eyeGlow.add(e); }
    this.headPivot.add(this.eyeGlow); this.eyeGlow.visible = false;
  }

  buildCone() {
    this.coneGeo = new THREE.BufferGeometry();
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(this.coneGeo, this.coneMat);
    this.cone.position.y = 0.03; this.cone.renderOrder = 2;
    this.scene.add(this.cone);
    this.setConeShape(9, 0.5);
  }
  setConeShape(range, half) {
    if (this._cr === range && this._ch === half) return;
    this._cr = range; this._ch = half;
    const seg = 18, pos = [0, 0, 0];
    for (let i = 0; i <= seg; i++) { const a = -half + (2 * half * i) / seg; pos.push(Math.sin(a) * range, 0, Math.cos(a) * range); }
    const idx = []; for (let i = 1; i <= seg; i++) idx.push(0, i, i + 1);
    this.coneGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); this.coneGeo.setIndex(idx); this.coneGeo.computeBoundingSphere();
  }

  reset(cfg) {
    this.cfg = cfg;
    this.pos = this.group.position;
    this.boardX = rand(-2.5, 2.5);
    this.pos.set(this.boardX, 0, BOARD_Z);
    this.yaw = Math.PI; this.headYaw = 0;
    this.state = "write"; this.timer = rand(3, 5);
    this.path = []; this.sus = 0; this.stalking = false; this.frozen = false;
    this.scripted = false; this.reached = false; this.lean = 0;
    this.group.scale.set(1, cfg.tall || 1, 1);
    const nk = cfg.neck || 1; this.neckMesh.scale.y = nk; this.neckMesh.position.y = 0.05 * nk; this.headPivot.position.y = 0.1 * nk;
    this.setFace(cfg.face || "normal");
    this.eyeGlow.visible = !!cfg.glow;
    this.visible(true);
    this.setConeShape(cfg.coneRange || 14, cfg.coneHalf || 0.45);
  }
  setFace(f) { this.face = f; this.faceMat.map = this.faces[f]; this.faceMat.needsUpdate = true; }
  visible(v) { this.group.visible = v; this.cone.visible = v && !this.hideCone; }

  // ---- helpers
  lookYaw() { return this.yaw + this.headYaw; }
  toPlayer() { return new THREE.Vector2(PLAYER_POS.x - this.pos.x, PLAYER_POS.z - this.pos.z); }
  distToPlayer() { return this.toPlayer().length(); }
  yawToPlayer() { const v = this.toPlayer(); return Math.atan2(v.x, v.y); }
  turnTo(target, rate, dt) { const d = angDiff(this.yaw, target); const s = Math.sign(d) * Math.min(Math.abs(d), rate * dt); this.yaw += s; if (Math.abs(d) > 0.3) this.turnLead = Math.max(-0.6, Math.min(0.6, d * 0.5)); return Math.abs(d) < 0.05; }
  walk(dt, speed) {
    if (!this.path.length) return true;
    const t = this.path[0];
    const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
    const step = speed * dt;
    this.moving = true;
    if (d <= step) { this.pos.x = t.x; this.pos.z = t.z; this.path.shift(); return !this.path.length; }
    this.pos.x += dx / d * step; this.pos.z += dz / d * step;
    this.turnTo(Math.atan2(dx, dz), 6, dt);
    this.walkPhase = (this.walkPhase || 0) + dt * speed * 6;
    this.stepAcc = (this.stepAcc || 0) + step;
    if (this.stepAcc > 0.55) { this.stepAcc = 0; this.onStep && this.onStep(); }
    return false;
  }
  nearestAisle(x) { return AISLES.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a)); }
  pathToBoard() {
    const ax = this.nearestAisle(this.pos.x);
    this.boardX = rand(-2.5, 2.5);
    this.path = this.pos.z > FRONT_Z + 0.2 ? [{ x: ax, z: this.pos.z }, { x: ax, z: FRONT_Z }, { x: this.boardX, z: BOARD_Z }] : [{ x: this.boardX, z: BOARD_Z }];
  }
  pathToward(x, z) {
    const ax = this.nearestAisle(x);
    const p = [];
    if (Math.abs(this.pos.x - ax) > 0.2) { if (this.pos.z > FRONT_Z + 0.2) p.push({ x: this.nearestAisle(this.pos.x), z: FRONT_Z }); p.push({ x: ax, z: FRONT_Z }); }
    p.push({ x: ax, z });
    this.path = p;
  }

  // ---- main update
  update(dt, ctx) {
    const cfg = this.cfg;
    this.armWrite = 0;
    if (this.scripted) { this.updateCone(ctx); return; }

    if (this.stalking) return this.updateStalk(dt, ctx);

    // investigate when suspicious
    if (this.sus > 45 && !["investigate", "turn", "watch"].includes(this.state)) {
      this.state = "investigate"; this.timer = 0; this.path = [];
      this.onEvent && this.onEvent("suspicious");
    }

    switch (this.state) {
      case "write": {
        this.yaw = Math.PI; this.armWrite = 1;
        this.timer -= dt;
        // head swivel: head turns all the way around while she keeps writing
        if (cfg.swivel && !this.swivel && Math.random() < cfg.swivel * dt) { this.swivel = { t: rand(1.6, 2.6) }; this.onEvent && this.onEvent("swivel"); }
        if (this.swivel) {
          this.swivel.t -= dt;
          const target = this.swivel.t > 0.4 ? Math.PI : 0;
          this.headYaw += angDiff(this.headYaw, target) * Math.min(1, dt * 7);
          if (this.swivel.t <= 0) { this.swivel = null; this.headYaw = 0; }
        }
        if (this.timer <= 0 && !this.swivel) {
          const lies = Math.random() < (cfg.lie || 0);
          this.state = lies ? "turn" : "tell";
          this.timer = lies ? 0 : rand(cfg.tellMin || 0.8, cfg.tellMax || 1.4);
          this.lied = lies;
          if (!lies) this.onEvent && this.onEvent("tell");
        }
        break;
      }
      case "tell":
        // chalk stops, arm drops, and she glances over her shoulder
        this.yaw = Math.PI; this.timer -= dt; this.turnLead = 0.45;
        if (this.timer <= 0) { this.state = "turn"; }
        break;
      case "turn": {
        const target = this.yawToPlayer() + rand(-0.4, 0.4) * 0.3;
        if (this.turnTo(target, cfg.turnSpeed || 7, dt)) {
          if (Math.random() < (cfg.patrol || 0.25)) {
            const ax = AISLES[Math.floor(Math.random() * 3)];
            this.state = "patrol"; this.path = [{ x: ax, z: FRONT_Z }, { x: ax, z: rand(1.5, 5.2) }];
          } else { this.state = "watch"; this.timer = rand(cfg.watchMin || 2, cfg.watchMax || 3.5); this.scanBase = this.yaw; this.scanT = 0; }
          this.onEvent && this.onEvent("faced");
        }
        break;
      }
      case "watch":
        this.scanT += dt; this.timer -= dt;
        this.yaw = this.scanBase + Math.sin(this.scanT * 1.3) * (cfg.scan || 0.45);
        if (this.timer <= 0) { this.state = "return"; this.pathToBoard(); }
        break;
      case "patrol":
        if (this.walk(dt, cfg.walkSpeed || 1.35)) { this.state = "patrolLook"; this.timer = rand(1.2, 2.2); this.scanBase = this.yaw; this.scanT = 0; }
        break;
      case "patrolLook":
        this.scanT += dt; this.timer -= dt;
        this.yaw = this.scanBase + Math.sin(this.scanT * 1.6) * 0.9;
        if (this.timer <= 0) { this.state = "return"; this.pathToBoard(); }
        break;
      case "return":
        if (this.walk(dt, cfg.walkSpeed || 1.35)) { this.state = "face"; }
        break;
      case "face":
        if (this.turnTo(Math.PI, 5, dt)) { this.state = "write"; this.timer = rand(cfg.writeMin || 5, cfg.writeMax || 9); }
        break;
      case "investigate": {
        if (!this.path.length && this.distToPlayer() > 2.4 && !this.invArrived) this.pathToward(PLAYER_POS.x, PLAYER_POS.z - 0.4);
        if (this.path.length) { if (this.walk(dt, (cfg.walkSpeed || 1.35) * 1.15)) this.invArrived = true; }
        else this.turnTo(this.yawToPlayer(), 4, dt);
        if (this.sus < 15) { this.invArrived = false; this.state = "return"; this.pathToBoard(); }
        break;
      }
    }
    this.updateCone(ctx);
    this.animate(dt);
  }

  updateStalk(dt, ctx) {
    // Moves only while you are not looking at her
    const cfg = this.cfg;
    this.frozen = ctx.seen;
    // she can't hold a stare forever: after a few seconds of being watched she gives up this approach
    if (ctx.seen && !this.reached) {
      this.seenT = (this.seenT || 0) + dt;
      if (this.seenT > (cfg.stareMax || 2.5)) { this.seenT = 0; this.onEvent && this.onEvent("stareDone"); return; }
    } else this.seenT = Math.max(0, (this.seenT || 0) - dt * 0.5);
    if (!this.frozen && !this.reached) {
      if (!this.path.length) this.pathToward(PLAYER_POS.x, PLAYER_POS.z - 0.3);
      const done = this.walk(dt, cfg.stalkSpeed || 1.2);
      if (done || this.distToPlayer() < 1.75) { this.reached = true; this.reachedT = 0; }
    }
    this.turnTo(this.yawToPlayer(), 8, dt);
    this.headYaw = 0;
    if (this.reached) { this.reachedT += dt; }
    this.updateCone(ctx);
    if (!this.frozen) this.animate(dt);
  }

  animate(dt) {
    const t = performance.now() / 1000;
    this.animT = (this.animT || 0) + dt;
    const moving = this.moving; this.moving = false;
    this.walkBlend = (this.walkBlend || 0) + ((moving ? 1 : 0) - (this.walkBlend || 0)) * Math.min(1, dt * 8);
    const ph = this.walkPhase || 0, s = Math.sin(ph), wb = this.walkBlend;
    const [L, R] = this.arms;
    // legs + hips
    this.legs[0].rotation.x = s * 0.45 * wb; this.legs[1].rotation.x = -s * 0.45 * wb;
    this.body.position.y = 0.92 + Math.abs(Math.cos(ph)) * 0.02 * wb + Math.sin(t * 1.7) * 0.004;
    this.body.rotation.z = s * 0.035 * wb;
    this.body.rotation.x = (this.lean || 0) + 0.04 * wb + Math.sin(t * 1.7) * 0.008;
    if (this.armWrite) {
      // writing on the board: chalk hand makes little strokes, other hand holds the book at her side
      const w = this.animT * 6.5;
      L.rotation.set(-2.4 + Math.sin(w) * 0.07, 0, 0.28 + Math.cos(w * 0.55) * 0.14);
      L.userData.elbow.rotation.x = -0.45 + Math.sin(w * 1.4) * 0.12;
      R.rotation.set(0.08, 0, 0.1); R.userData.elbow.rotation.x = -1.1;
      this.headPivot.rotation.x = -0.14 + Math.sin(w * 0.5) * 0.03;
    } else {
      // natural arm swing while walking, relaxed when standing
      L.rotation.set(-s * 0.38 * wb + 0.04, 0, -0.07); L.userData.elbow.rotation.x = -0.18 - 0.2 * wb;
      R.rotation.set(s * 0.38 * wb + 0.04, 0, 0.07); R.userData.elbow.rotation.x = -0.18 - 0.2 * wb;
      // standing still she tilts her head down a little to look over her glasses
      const look = this.state === "watch" || this.state === "patrolLook" || this.state === "investigate" ? 0.1 : 0;
      this.headPivot.rotation.x += (look - this.headPivot.rotation.x) * Math.min(1, dt * 4);
    }
    this.headPivot.rotation.z = Math.sin(t * 0.8) * 0.03 + (this.state === "watch" ? Math.sin(t * 0.5) * 0.06 : 0);
    // the head leads when she turns (visual only)
    this.turnLead = (this.turnLead || 0) * Math.exp(-dt * 5);
    this.headPivot.rotation.y = this.headYaw + this.turnLead;
  }

  updateCone(ctx) {
    this.cone.position.x = this.pos.x; this.cone.position.z = this.pos.z;
    this.cone.rotation.y = this.lookYaw();
    this.group.rotation.y = this.yaw;
    this.headPivot.rotation.y = this.headYaw + (this.turnLead || 0);
    this.body.rotation.x = this.lean || 0;
    const hot = Math.min(1, this.sus / 100);
    const base = new THREE.Color(this.cfg.coneColor || 0xfff2a0);
    this.coneMat.color.copy(base).lerp(new THREE.Color(0xff2020), hot);
    this.coneMat.opacity = (this.cfg.coneOpacity ?? 0.18) + hot * 0.15 + (this.cfg.coneFlicker ? (Math.random() < 0.08 ? -0.15 : 0) : 0);
  }

  // ---- detection; returns {inCone, dist}
  detect(dt, ctx) {
    const cfg = this.cfg;
    const v = this.toPlayer(), dist = v.length();
    const ly = this.lookYaw();
    const fwd = new THREE.Vector2(Math.sin(ly), Math.cos(ly));
    const ang = Math.acos(Math.max(-1, Math.min(1, v.clone().normalize().dot(fwd))));
    const range = cfg.coneRange || 14, half = cfg.coneHalf || 0.45;
    const inCone = this.group.visible && dist < range && ang < half && !ctx.lightsOut;
    const front = this.pos.z < PLAYER_POS.z - 0.6;
    const blocked = ctx.book > 0.8 && front && dist > 1.4;
    let rise = 0;
    if (inCone && ctx.bad && !blocked) rise += 210 * (1.3 - dist / range) * (cfg.detect || 1);
    if (inCone && ctx.book > 0.8 && dist < 3.2) rise += 12;
    if (ctx.noise > 0 && dist < 8 && this.group.visible) rise += ctx.noise * 34 * (1 - dist / 8);
    if (rise > 0) this.sus += rise * dt; else this.sus -= (cfg.decay || 14) * dt;
    this.sus = Math.max(0, Math.min(100, this.sus));
    this.inCone = inCone;
    return { inCone, dist, blocked };
  }

  goToBoardNow() {
    this.boardX = rand(-2.5, 2.5);
    this.pos.set(this.boardX, 0, BOARD_Z); this.yaw = Math.PI; this.headYaw = 0;
    this.state = "write"; this.timer = rand(3, 6); this.path = []; this.reached = false; this.invArrived = false;
    this.updateCone({});
  }
  placeAt(x, z, yaw) { this.pos.set(x, 0, z); this.yaw = yaw; this.headYaw = 0; this.updateCone({}); }
}
