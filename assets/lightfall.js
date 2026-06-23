const hexToRGB = hex => {
  const c = hex.replace('#', '').padEnd(6, '0');
  return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
};

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
precision highp float;
uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;
uniform vec3  uColor0,uColor1,uColor2,uColor3,uColor4,uColor5,uColor6,uColor7;
uniform int   uColorCount;
uniform vec3  uBgColor;
uniform float uSpeed,uStreakWidth,uStreakLength,uGlow,uDensity,uTwinkle,uZoom,uBgGlow,uOpacity;
uniform float uMouseEnabled,uMouseStrength,uMouseRadius;
varying vec2 vUv;

vec3 palette(float h){
  int cnt=uColorCount;if(cnt<1)cnt=1;
  int i=int(floor(clamp(h,0.,.999999)*float(cnt)));
  if(i<=0)return uColor0;if(i==1)return uColor1;if(i==2)return uColor2;if(i==3)return uColor3;
  if(i==4)return uColor4;if(i==5)return uColor5;if(i==6)return uColor6;return uColor7;
}
vec3 tanhv(vec3 x){vec3 e=exp(-2.*x);return(1.-e)/(1.+e);}
vec2 sceneC(vec2 f,vec2 r){
  vec2 P=(f+f-r)/r.x;float z=0.,d=1e3;vec4 O=vec4(0.);
  for(int k=0;k<39;k++){if(d<=1e-4)break;O=z*normalize(vec4(P,uZoom,0.))-vec4(0.,4.,1.,0.)/4.5;d=1.-sqrt(length(O*O));z+=d;}
  return vec2(O.x,atan(O.z,O.y));
}
void mainImage(out vec4 o,vec2 C){
  vec2 r=iResolution.xy;
  vec2 uv0=(C+C-r)/r.x;
  float T=.1*iTime*uSpeed+9.;
  float angRings=max(1.,floor(6.28318530718*max(uDensity,.05)+.5));
  vec2 Y=vec2(5e-3,6.28318530718/angRings);
  vec2 c0=sceneC(C,r);vec2 cdx=sceneC(C+vec2(1.,0.),r);vec2 cdy=sceneC(C+vec2(0.,1.),r);
  vec2 dCx=cdx-c0,dCy=cdy-c0;
  dCx.y-=6.28318530718*floor(dCx.y/6.28318530718+.5);
  dCy.y-=6.28318530718*floor(dCy.y/6.28318530718+.5);
  vec2 fw=abs(dCx)+abs(dCy);C=c0;
  vec2 P=vec2(2.,1.)*uv0-(r/r.x)*vec2(0.,1.);
  vec4 O=vec4(uBgColor*90.*uBgGlow/(1e3*dot(P,P)+6.),0.);
  float mGlow=0.;
  if(uMouseEnabled>.5){
    vec2 mN=(iMouse+iMouse-r)/r.x;
    float md=length(uv0-mN);
    mGlow=exp(-md*md/max(uMouseRadius*uMouseRadius,1e-4))*uMouseStrength;
    O.rgb+=mGlow*.25;
  }
  float zr=5e-4*uStreakWidth;
  vec2 rr=vec2(max(length(fw),1e-5));
  float tail=19./max(uStreakLength,.05);
  for(int m=0;m<16;m++){
    if(m>=uStreakCount)break;
    float jf=float(m)+1.;
    float ic=fract(sin(dot(vec2(jf,floor(C.x/Y.x+.5)),vec2(7.,11.))*73.));
    vec2 Pp=C-(T+T*ic)*vec2(0.,1.);
    Pp-=floor(Pp/Y+.5)*Y;
    float h=fract(8663.*ic);
    vec3 col=palette(h);
    float weight=mix(1.5,1.+sin(T+7.*h+4.),uTwinkle);
    weight*=(1.+mGlow*2.);
    vec2 inner=vec2(length(max(Pp,vec2(-1.,0.))),length(Pp)-zr)-zr;
    vec2 sm=vec2(1.)-smoothstep(-rr,rr,inner);
    O.rgb+=dot(sm,vec2(exp(tail*Pp.y),3.))*col*weight;
    C.x+=Y.x/8.;
  }
  vec3 colr=sqrt(tanhv(max(O.rgb*uGlow-vec3(.04,.08,.02),0.)));
  o=vec4(colr,uOpacity);
}
void main(){vec4 c;mainImage(c,vUv*iResolution.xy);gl_FragColor=c;}
`;

class Lightfall {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = {
      colors: opts.colors || ['#A6C8FF', '#5227FF', '#FF9FFC'],
      backgroundColor: opts.backgroundColor || '#0A29FF',
      speed: opts.speed ?? 0.5,
      streakCount: opts.streakCount ?? 2,
      streakWidth: opts.streakWidth ?? 1,
      streakLength: opts.streakLength ?? 1,
      glow: opts.glow ?? 1,
      density: opts.density ?? 0.6,
      twinkle: opts.twinkle ?? 1,
      zoom: opts.zoom ?? 3,
      backgroundGlow: opts.backgroundGlow ?? 0.5,
      opacity: opts.opacity ?? 1,
      mouseInteraction: opts.mouseInteraction ?? true,
      mouseStrength: opts.mouseStrength ?? 0.5,
      mouseRadius: opts.mouseRadius ?? 1,
    };
    this.mouse = [0, 0];
    this.targetMouse = [0, 0];
    this.raf = null;
    this.init();
  }

  async init() {
    const { Renderer, Program, Mesh, Triangle } = await import('https://cdn.jsdelivr.net/npm/ogl/+esm');
    const renderer = new Renderer({
      alpha: true, antialias: true,
      dpr: window.devicePixelRatio || 1
    });
    this.renderer = renderer;
    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    canvas.style.pointerEvents = 'none';
    this.container.insertBefore(canvas, this.container.firstChild);

    const colors = this.prepColors(this.opts.colors);
    const bgColor = hexToRGB(this.opts.backgroundColor);

    const uniforms = {
      iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] },
      iMouse: { value: [0, 0] },
      iTime: { value: 0 },
      uColor0: { value: colors[0] }, uColor1: { value: colors[1] },
      uColor2: { value: colors[2] }, uColor3: { value: colors[3] },
      uColor4: { value: colors[4] }, uColor5: { value: colors[5] },
      uColor6: { value: colors[6] }, uColor7: { value: colors[7] },
      uColorCount: { value: colors.length },
      uBgColor: { value: bgColor },
      uSpeed: { value: this.opts.speed },
      uStreakCount: { value: Math.max(1, Math.min(16, Math.round(this.opts.streakCount))) },
      uStreakWidth: { value: this.opts.streakWidth },
      uStreakLength: { value: this.opts.streakLength },
      uGlow: { value: this.opts.glow },
      uDensity: { value: this.opts.density },
      uTwinkle: { value: this.opts.twinkle },
      uZoom: { value: this.opts.zoom },
      uBgGlow: { value: this.opts.backgroundGlow },
      uOpacity: { value: this.opts.opacity },
      uMouseEnabled: { value: this.opts.mouseInteraction ? 1 : 0 },
      uMouseStrength: { value: this.opts.mouseStrength },
      uMouseRadius: { value: this.opts.mouseRadius }
    };
    this.uniforms = uniforms;

    const program = new Program(gl, { vertex, fragment, uniforms });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const rect = this.container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1];
    };
    resize();
    window.addEventListener('resize', resize);
    this.resizeFn = resize;

    if (this.opts.mouseInteraction) {
      const onMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const dpr = renderer.dpr || 1;
        this.targetMouse = [(e.clientX - rect.left) * dpr, ((rect.height - (e.clientY - rect.top)) * dpr)];
      };
      canvas.addEventListener('pointermove', onMove);
      this.mouseFn = onMove;
    }

    const loop = (t) => {
      this.raf = requestAnimationFrame(loop);
      uniforms.iTime.value = t * 0.001;
      this.mouse[0] += (this.targetMouse[0] - this.mouse[0]) * 0.1;
      this.mouse[1] += (this.targetMouse[1] - this.mouse[1]) * 0.1;
      uniforms.iMouse.value = [this.mouse[0], this.mouse[1]];
      renderer.render({ scene: mesh });
    };
    this.raf = requestAnimationFrame(loop);
  }

  prepColors(input) {
    const base = (input && input.length ? input : ['#A6C8FF', '#5227FF', '#FF9FFC']).slice(0, 8);
    const arr = [];
    for (let i = 0; i < 8; i++) arr.push(hexToRGB(base[Math.min(i, base.length - 1)]));
    return arr;
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.mouseFn && this.renderer) {
      this.renderer.gl.canvas.removeEventListener('pointermove', this.mouseFn);
    }
    if (this.resizeFn) window.removeEventListener('resize', this.resizeFn);
    const cvs = this.container.querySelector('canvas');
    if (cvs) cvs.remove();
    if (this.renderer) this.renderer.destroy();
  }
}

export default Lightfall;
