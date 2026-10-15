import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';

let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
window.addEventListener('motion-change',e=>paused=e.detail);
const mouse=new THREE.Vector2(),smoothMouse=new THREE.Vector2();
window.addEventListener('pointermove',e=>{mouse.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1)});
function rendererFor(canvas,alpha=true){const r=new THREE.WebGLRenderer({canvas,alpha,antialias:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.2;return r}
function observeSize(canvas,renderer,camera){const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);if(camera.isPerspectiveCamera){camera.aspect=w/h;camera.updateProjectionMatrix()}};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();return ()=>observer.disconnect()}
const gold=new THREE.MeshStandardMaterial({color:0xb6a276,roughness:.48,metalness:.72});
function stoneMaterial(color=0xd7c8a5){return new THREE.MeshStandardMaterial({color,roughness:.83,metalness:.03})}
function particles(count,spread=12){const g=new THREE.BufferGeometry(),a=new Float32Array(count*3);for(let i=0;i<a.length;i+=3){a[i]=(Math.random()-.5)*spread;a[i+1]=Math.random()*8-2;a[i+2]=(Math.random()-.5)*8}g.setAttribute('position',new THREE.BufferAttribute(a,3));const m=new THREE.PointsMaterial({size:.018,color:0xe6c88a,transparent:true,opacity:.45,depthWrite:false,sizeAttenuation:true});return new THREE.Points(g,m)}
const heroCanvas=document.querySelector('#painting-canvas');
try{
 const r=rendererFor(heroCanvas);r.toneMapping=THREE.NoToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.z=5;
 const textureLoader=new THREE.TextureLoader();const names=['sisyphus','hephaestus','hermes','athena'];const textures=[];let current=0,next=0,mix=1;
 const uniforms={uImage:{value:null},uNext:{value:null},uMix:{value:1},uTime:{value:0},uMouse:{value:new THREE.Vector2()},uAspect:{value:1},uImgAspect:{value:1.5}};
 const mat=new THREE.ShaderMaterial({uniforms,vertexShader:`varying vec2 vUv; uniform float uTime; uniform vec2 uMouse; void main(){vUv=uv; vec3 p=position; p.z+=sin(uv.x*5.0+uTime*.13)*.025+cos(uv.y*4.0+uTime*.11)*.018; p.z+=uMouse.x*(uv.x-.5)*.06; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec2 vUv; uniform sampler2D uImage; uniform sampler2D uNext; uniform float uMix; uniform float uTime; uniform float uAspect; uniform float uImgAspect; uniform vec2 uMouse; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){vec2 uv=vUv; vec2 scale=vec2(min(uAspect/uImgAspect,1.),min(uImgAspect/uAspect,1.)); uv=(uv-.5)*scale+.5; uv+=uMouse*vec2(.009,.006); uv.x+=sin(uv.y*7.+uTime*.10)*.0012; vec3 c=mix(texture2D(uImage,uv).rgb,texture2D(uNext,uv).rgb,smoothstep(0.,1.,uMix)); float grain=(hash(gl_FragCoord.xy)-.5)*.028; c+=grain; float vignette=1.-.11*length(vUv-.5); c*=vignette; gl_FragColor=vec4(c,1.);}`});
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1,42,28),mat);scene.add(plane);
 names.forEach((n,i)=>textureLoader.load(`assets/${n}.png`,t=>{textures[i]=t;if(i===0){uniforms.uImage.value=t;uniforms.uNext.value=t;heroCanvas.style.opacity='1'}},undefined,()=>{document.querySelector('#scene-status').textContent='THE PAINTED CANVAS'}));
 const dust=particles(130,15);dust.position.set(1,-1,0);scene.add(dust);
 const resize=()=>{const w=heroCanvas.clientWidth,h=heroCanvas.clientHeight;r.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const height=2*Math.tan(THREE.MathUtils.degToRad(21))*5;plane.scale.set(height*camera.aspect*1.04,height*1.04,1);uniforms.uAspect.value=w/h};new ResizeObserver(resize).observe(heroCanvas);resize();
 window.addEventListener('chapter-change',e=>{if(!textures[e.detail])return;uniforms.uImage.value=textures[current]||textures[0];uniforms.uNext.value=textures[e.detail];next=e.detail;mix=paused?1:0;if(paused)current=next});
 let visible=true;new IntersectionObserver(([entry])=>visible=entry.isIntersecting).observe(heroCanvas);
 let time=0,last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden)return;if(!paused){time+=dt;smoothMouse.lerp(mouse,.025);dust.rotation.z=Math.sin(time*.04)*.07;dust.position.y=-1+Math.sin(time*.1)*.15}uniforms.uTime.value=time;uniforms.uMouse.value.copy(paused?new THREE.Vector2():smoothMouse);if(mix<1){mix=Math.min(1,mix+dt*.8);if(mix===1)current=next}uniforms.uMix.value=mix;r.render(scene,camera)}requestAnimationFrame(frame);
 heroCanvas.addEventListener('webglcontextlost',()=>{heroCanvas.style.opacity=0;document.querySelector('#scene-status').textContent='THE PAINTED CANVAS'});
}catch(error){document.querySelector('#scene-status').textContent='THE PAINTED CANVAS';console.warn('Painting renderer unavailable',error)}

const draco=new DRACOLoader();draco.setDecoderPath('./vendor/draco/');draco.setWorkerLimit(2);
const loader=new GLTFLoader().setDRACOLoader(draco);
let modelPromise;
function getModel(){if(!modelPromise)modelPromise=loader.loadAsync('./models/kouros.glb').then(gltf=>{
 const source=gltf.scene;source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const group=new THREE.Group();source.position.sub(center);group.add(source);group.scale.setScalar(2.6/Math.max(size.y,.001));
 source.traverse(obj=>{if(obj.isMesh){obj.material=stoneMaterial(0xe6d8b7);obj.castShadow=true;obj.receiveShadow=true}});
 return group;
});return modelPromise}
function cylinder(radiusTop,radiusBottom,height,material,segments=48){const m=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),material);m.castShadow=true;m.receiveShadow=true;return m}
function column(x,z,height,mat){const group=new THREE.Group();group.position.set(x,0,z);const base=cylinder(.48,.53,.17,mat);base.position.y=.085;group.add(base);const step=cylinder(.40,.46,.12,mat);step.position.y=.23;group.add(step);const shaft=cylinder(.25,.31,height,mat,32);shaft.position.y=height/2+.3;group.add(shaft);for(let i=0;i<16;i++){const angle=i/16*Math.PI*2;const flute=cylinder(.022,.027,height-.12,mat,6);flute.position.set(Math.cos(angle)*.267,height/2+.3,Math.sin(angle)*.267);group.add(flute)}const capital=cylinder(.40,.31,.18,mat);capital.position.y=height+.35;group.add(capital);const top=new THREE.Mesh(new THREE.BoxGeometry(.88,.16,.88),mat);top.position.y=height+.51;top.castShadow=true;group.add(top);return group}
function buildAtelier(canvas,immersive=false){
 const r=rendererFor(canvas);r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x344b3e,.045);
 const camera=new THREE.PerspectiveCamera(immersive?38:33,1,.1,70);camera.position.set(immersive?5:3.5,3.1,immersive?8.5:7.2);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,2.2,0);controls.enableDamping=true;controls.dampingFactor=.06;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=immersive?14:10;controls.minPolarAngle=.45;controls.maxPolarAngle=1.65;controls.autoRotate=!paused;controls.autoRotateSpeed=.25;controls.enableZoom=immersive;
 scene.add(new THREE.HemisphereLight(0xf4eed8,0x566554,2.2));const ambient=new THREE.AmbientLight(0xc5d0bc,.8);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffe1ac,5);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.03;scene.add(sun);
 const rim=new THREE.DirectionalLight(0xc9d6cd,2.5);rim.position.set(4,3,-4);scene.add(rim);
 const clay=stoneMaterial(0x8a967b),darkStone=stoneMaterial(0x6f7b65);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(15,96),darkStone);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const pedestal=cylinder(.88,1,.28,clay);pedestal.position.y=.14;scene.add(pedestal);const step=cylinder(.77,.83,.13,clay);step.position.y=.345;scene.add(step);
 const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.35,.85,1.25),stoneMaterial(0xb4b598));plinth.position.y=.82;plinth.castShadow=true;plinth.receiveShadow=true;scene.add(plinth);
 const cap=new THREE.Mesh(new THREE.BoxGeometry(1.5,.12,1.4),clay);cap.position.y=1.3;cap.castShadow=true;scene.add(cap);
 const plaque=new THREE.Mesh(new THREE.BoxGeometry(.5,.14,.016),gold);plaque.position.set(0,.84,.635);scene.add(plaque);
 const sculptureRoot=new THREE.Group();sculptureRoot.position.y=2.65;scene.add(sculptureRoot);
 const archGroup=new THREE.Group();const positions=immersive?[[-3,-2,5],[3,-2,5],[-4,1,3.8],[4,1,3.8],[-2.5,-5,4.5],[2.5,-5,4.5]]:[[-2.6,-2.2,4.5],[2.6,-2.2,4.5]];
 for(const [x,z,h]of positions)archGroup.add(column(x,z,h,darkStone));
 const lintel=new THREE.Mesh(new THREE.BoxGeometry(6.8,.4,.9),darkStone);lintel.position.set(0,5.05,-2.2);lintel.castShadow=true;archGroup.add(lintel);scene.add(archGroup);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.008,8,128),gold);ring.position.set(0,2.7,-.8);scene.add(ring);
 const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.05,.004,6,128),gold);ring2.position.copy(ring.position);scene.add(ring2);
 const dust=particles(immersive?350:150,12);scene.add(dust);
 // A contemporary exhibition armature highlights the fragment without inventing missing anatomy.
 const supportRod=cylinder(.025,.025,1.1,gold,12);supportRod.position.set(0,1.75,0);scene.add(supportRod);
 let alive=true,visible=true,time=0,last=performance.now(),modelLoaded=false;
 const stopResize=observeSize(canvas,r,camera);const io=new IntersectionObserver(([entry])=>visible=entry.isIntersecting);io.observe(canvas);
 getModel().then(model=>{if(!alive)return;const clone=model.clone(true);sculptureRoot.add(clone);modelLoaded=true;canvas.dataset.modelLoaded='true';if(!immersive){document.querySelector('#model-status').textContent='DRAG TO ROTATE · ANCIENT KOUROS';document.querySelector('.sculpture-fallback').style.display='none'}}).catch(error=>{if(!immersive)document.querySelector('#model-status').textContent='SCULPTURE UNAVAILABLE · RETRY BY RELOADING';console.error('Sculpture load failed',error)});
 let interact=false;controls.addEventListener('start',()=>{interact=true;controls.autoRotate=false});
 const motionListener=()=>{controls.autoRotate=!paused&&!interact};window.addEventListener('motion-change',motionListener);
 function animate(now){if(!alive)return;requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if((!visible&&!immersive)||document.hidden)return;if(!paused){time+=dt;dust.rotation.y=time*.012;ring.rotation.z=time*.02;ring2.rotation.y=Math.sin(time*.09)*.12}controls.update();r.render(scene,camera)}requestAnimationFrame(animate);
 const reset=()=>{camera.position.set(immersive?5:3.5,3.1,immersive?8.5:7.2);controls.target.set(0,2.2,0);interact=false;controls.autoRotate=!paused;controls.update()};
 return {reset,dispose(){alive=false;stopResize();io.disconnect();controls.dispose();window.removeEventListener('motion-change',motionListener);scene.traverse(obj=>{if(obj.geometry&&!sculptureRoot.getObjectById(obj.id))obj.geometry.dispose()});r.dispose();r.forceContextLoss()}};
}
let sculpture,gallery;
try{sculpture=buildAtelier(document.querySelector('#sculpture-canvas'));document.querySelector('#reset-sculpture').onclick=()=>sculpture.reset()}catch(error){document.querySelector('#model-status').textContent='3D UNAVAILABLE IN THIS BROWSER';console.warn(error)}
window.addEventListener('gallery-open',e=>{gallery?.dispose();try{gallery=buildAtelier(e.detail,true)}catch(error){e.detail.insertAdjacentHTML('afterend','<p style="position:absolute;bottom:80px">WebGL is unavailable in this browser. Explore the painted artwork on the main page.</p>')}});
window.addEventListener('gallery-close',()=>{gallery?.dispose();gallery=null});
