// Bloom for the high quality setting: bright parts of the picture get a soft glow.
// Scene -> off-screen target -> bright pass at quarter size -> blur -> added back, then tone mapping.
import * as THREE from '../../vendor/three.module.min.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = false;
    this.ok = true;
    this.ready = false;
    this.w = 2; this.h = 2;
  }

  init() {
    const r = this.renderer;
    try {
      const gl = r.getContext();
      const float = r.capabilities.isWebGL2 !== false && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
      const type = float ? THREE.HalfFloatType : THREE.UnsignedByteType;
      this.rtScene = new THREE.WebGLRenderTarget(2, 2, { type, samples: 4, depthBuffer: true, stencilBuffer: true });
      const small = { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      this.rtA = new THREE.WebGLRenderTarget(2, 2, small);
      this.rtB = new THREE.WebGLRenderTarget(2, 2, small);
      this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
      this.quad.frustumCulled = false;
      this.qscene = new THREE.Scene();
      this.qscene.add(this.quad);
      const mk = (frag, uniforms, tone) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: tone });
      this.mBright = mk(`uniform sampler2D tMap; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tMap, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float k = smoothstep(0.92, 1.5, l); gl_FragColor = vec4(c * k, 1.0); }`, { tMap: { value: null } }, false);
      this.mBlur = mk(`uniform sampler2D tMap; uniform vec2 dir; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tMap, vUv).rgb * 0.227;
          c += (texture2D(tMap, vUv + dir * 1.385).rgb + texture2D(tMap, vUv - dir * 1.385).rgb) * 0.316;
          c += (texture2D(tMap, vUv + dir * 3.231).rgb + texture2D(tMap, vUv - dir * 3.231).rgb) * 0.070;
          gl_FragColor = vec4(c, 1.0); }`, { tMap: { value: null }, dir: { value: new THREE.Vector2() } }, false);
      this.mFinal = mk(`uniform sampler2D tScene; uniform sampler2D tBloom; uniform float strength; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * strength;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`, { tScene: { value: null }, tBloom: { value: null }, strength: { value: 0.9 } }, true);
      this.ready = true;
      this.applySize();
    } catch (e) {
      console.warn('bloom not available', e);
      this.ok = false; this.enabled = false;
    }
  }

  setEnabled(on) {
    this.enabled = !!on && this.ok;
    if (this.enabled && !this.ready) this.init();
  }

  resize(w, h, ratio) {
    this.w = Math.max(2, Math.floor(w * ratio)); this.h = Math.max(2, Math.floor(h * ratio));
    if (this.ready) this.applySize();
  }

  applySize() {
    this.rtScene.setSize(this.w, this.h);
    const qw = Math.max(2, this.w >> 2), qh = Math.max(2, this.h >> 2);
    this.rtA.setSize(qw, qh); this.rtB.setSize(qw, qh);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.qscene, this.cam);
  }

  render(scene, camera) {
    const r = this.renderer;
    try {
      r.setRenderTarget(this.rtScene);
      r.render(scene, camera);
      this.mBright.uniforms.tMap.value = this.rtScene.texture;
      this.pass(this.mBright, this.rtA);
      for (let i = 0; i < 2; i++) {
        this.mBlur.uniforms.tMap.value = this.rtA.texture;
        this.mBlur.uniforms.dir.value.set((1 + i) / this.rtA.width, 0);
        this.pass(this.mBlur, this.rtB);
        this.mBlur.uniforms.tMap.value = this.rtB.texture;
        this.mBlur.uniforms.dir.value.set(0, (1 + i) / this.rtA.height);
        this.pass(this.mBlur, this.rtA);
      }
      this.mFinal.uniforms.tScene.value = this.rtScene.texture;
      this.mFinal.uniforms.tBloom.value = this.rtA.texture;
      this.pass(this.mFinal, null);
    } catch (e) {
      console.warn('bloom failed', e);
      this.ok = false; this.enabled = false;
      r.setRenderTarget(null);
      r.render(scene, camera);
    }
  }
}
