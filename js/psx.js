// PS1-style helpers: vertex snapping, affine texture mapping, pixel textures, low-res post pass
import * as THREE from "three";

export const SNAP = { value: new THREE.Vector2(160, 120) };

function patch(m, { affine = true } = {}) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uSnap = SNAP;
    s.vertexShader = "uniform vec2 uSnap;\nvarying vec3 vAff;\n" + s.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;
      #ifdef USE_MAP
        vAff = vec3(vMapUv * gl_Position.w, gl_Position.w);
      #endif`);
    if (affine) {
      s.fragmentShader = "varying vec3 vAff;\n" + s.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vAff.xy / vAff.z );
          diffuseColor *= sampledDiffuseColor;
        #endif`);
    }
  };
  return m;
}

export function lit(params = {}, opts) { return patch(new THREE.MeshLambertMaterial(params), opts); }
export function flat(params = {}, opts) { return patch(new THREE.MeshBasicMaterial(params), opts); }

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = c; t.userData.g = g;
  return t;
}

export function noise(g, w, h, amt = 18) {
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
  }
  g.putImageData(d, 0, 0);
}

const POST_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime, uSplit, uBlur, uGrain, uRed, uVig, uFade, uUrge, uShake, uInvert;
varying vec2 vUv;
float bayer4(vec2 p){
  vec2 q = mod(floor(p), 4.0);
  float a = mod(q.x, 2.0), b = mod(q.y, 2.0);
  float c = floor(q.x / 2.0), d = floor(q.y / 2.0);
  float v = 4.0 * (2.0 * mod(a + b, 2.0) + b) + (2.0 * mod(c + d, 2.0) + d);
  return v / 16.0 - 0.5;
}
void main(){
  vec2 uv = vUv;
  uv.x += uShake * (fract(sin(uTime * 91.0) * 437.5) - 0.5) * 0.06;
  uv.y += uShake * (fract(sin(uTime * 57.0) * 917.3) - 0.5) * 0.06;
  uv.x += sin(uv.y * 30.0 + uTime * 3.0) * 0.002 * uUrge;
  vec3 c = texture2D(tScene, uv).rgb;
  float b = smoothstep(uSplit - 0.05, uSplit + 0.05, uv.y) * uBlur;
  if (b > 0.001) {
    vec3 acc = vec3(0.0);
    vec2 r = vec2(uRes.y / uRes.x, 1.0) * (2.5 / uRes.y);
    for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++)
      acc += texture2D(tScene, uv + vec2(float(i), float(j)) * r).rgb;
    acc /= 25.0;
    c = mix(c, acc * 0.65, b);
  }
  c = mix(c, vec3(1.0) - c, uInvert);
  float n = fract(sin(dot(floor(uv * uRes) + uTime * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uGrain;
  c = mix(c, vec3(dot(c, vec3(0.5, 0.3, 0.2))) * vec3(1.5, 0.35, 0.35), uRed);
  c += vec3(0.25, 0.0, 0.2) * uUrge * (0.5 + 0.5 * sin(uTime * 6.0)) * smoothstep(0.3, 0.75, length(vUv - 0.5));
  vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * uVig;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += bayer4(uv * uRes) / 24.0;
  c = floor(c * 31.0 + 0.5) / 31.0;
  gl_FragColor = vec4(c * uFade, 1.0);
}`;

export class PSXRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.height = 360;
    this.rt = new THREE.WebGLRenderTarget(16, 16, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.uniforms = {
      tScene: { value: this.rt.texture }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
      uSplit: { value: 0.62 }, uBlur: { value: 0 }, uGrain: { value: 0.04 }, uRed: { value: 0 }, uVig: { value: 1.2 },
      uFade: { value: 1 }, uUrge: { value: 0 }, uShake: { value: 0 }, uInvert: { value: 0 },
    };
    this.post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: POST_FS, uniforms: this.uniforms, depthTest: false, depthWrite: false }));
    this.postScene = new THREE.Scene(); this.postScene.add(this.post);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.resize();
    addEventListener("resize", () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const lh = this.height, lw = Math.round(lh * w / h);
    this.rt.setSize(lw, lh);
    this.uniforms.uRes.value.set(lw, lh);
    SNAP.value.set(lw / 1.5, lh / 1.5);
    this.aspect = w / h;
    this.onResize && this.onResize(this.aspect);
  }
  render(scene, camera) {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCam);
  }
}
