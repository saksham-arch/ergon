import * as T from 'three';
import {materials as M,mesh,ellipsoid,box,cyl,tube,ring,column,dais,temple,tree,cypress,gates,boulder,vase,sisyphus,hephaestus,hermes,athena,laurel} from './myth-models.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v)};
const canvas=$('#journey-canvas'),stage=$('#cinema-stage'),section=$('.cinema-scroll');
const anchors=[0,.305,.535,.735,.935];let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,paused=reduced;
let targetProgress=0,progress=0,time=0,selectedJob=0,promiseCount=0,activeChapter=0,craftPulse=0;
const pointer=new T.Vector2(),mouse=new T.Vector2(),raycaster=new T.Raycaster(),clickables=[];
let renderer,scene,camera,gate,worker,smith,messenger,guardian,stones=[],stoneRings=[],sparks,promiseOrbs=[],sun,worldGroups=[];
let celebrateDispose;
const names=[['THE HESPERIDES','A garden at the edge of possibility.'],['SISYPHUS & THE PATH','Choose the stone. Choose your next step.'],['HEPHAESTUS & THE FORGE','There is art in every skill.'],['HERMES & THE PROMISE','A good connection begins with clarity.'],['ATHENA & THE OLIVE','Wisdom for the road ahead.']];

function travel(index){const top=section.getBoundingClientRect().top+scrollY,range=section.offsetHeight-innerHeight;window.scrollTo({top:top+anchors[index]*range,behavior:paused?'instant':'smooth'})}
$$('[data-travel]').forEach(b=>b.addEventListener('click',()=>travel(Number(b.dataset.travel))));
window.addEventListener('travel-chapter',e=>travel(e.detail));
window.addEventListener('motion-change',e=>{paused=e.detail});
window.addEventListener('promise-change',e=>promiseCount=e.detail);
window.addEventListener('craft-created',()=>craftPulse=1);
window.addEventListener('craft-select',()=>craftPulse=1);
window.addEventListener('job-selected',e=>selectStone(e.detail,false));
$$('[data-stone]').forEach(b=>b.addEventListener('click',()=>selectStone(Number(b.dataset.stone))));
function selectStone(i,notify=true){selectedJob=i;$$('[data-stone]').forEach((b,n)=>{b.classList.toggle('active',n===i);b.setAttribute('aria-pressed',String(n===i))});if(notify)window.dispatchEvent(new CustomEvent('stone-selected',{detail:i}))}

function skyTexture(){const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,1024);g.addColorStop(0,'#829c96');g.addColorStop(.38,'#c5caba');g.addColorStop(.55,'#e8dcc0');g.addColorStop(.72,'#c6c5a5');g.addColorStop(1,'#6f8066');ctx.fillStyle=g;ctx.fillRect(0,0,2048,1024);const glow=ctx.createRadialGradient(1350,420,10,1350,420,270);glow.addColorStop(0,'#fff9dd');glow.addColorStop(.15,'#f5e9bfbb');glow.addColorStop(1,'#f5e9bf00');ctx.fillStyle=glow;ctx.fillRect(1000,100,700,650);const t=new T.CanvasTexture(c);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;return t}
function makeRenderer(c){const r=new T.WebGLRenderer({canvas:c,antialias:true,alpha:false,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;return r}
function lightScene(s){s.add(new T.HemisphereLight(0xf7ebca,0x4a624d,1.35));const light=new T.DirectionalLight(0xffe8be,2.6);light.position.set(-15,22,15);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-18,right:18,top:20,bottom:-14,near:1,far:70});light.shadow.normalBias=.035;light.shadow.bias=-.0001;s.add(light);s.add(light.target);const rim=new T.DirectionalLight(0xa6b6ab,1.1);rim.position.set(15,6,-8);s.add(rim);return light}
function ground(s){const g=mesh(new T.PlaneGeometry(240,260),M.green,s,[0,-.22,-60]);g.rotation.x=-Math.PI/2;g.castShadow=false;const path=mesh(new T.PlaneGeometry(8.1,165),M.limestone,s,[3,-.205,-65]);path.rotation.x=-Math.PI/2;path.castShadow=false;for(const x of[-1.14,7.14]){const band=box(s,[x,-.18,-65],[.035,.015,165],M.gold);band.castShadow=false;}const seams=new T.Group();s.add(seams);for(let z=18;z>-147;z-=2.8){const seam=box(seams,[3,-.18,z],[7.9,.008,.015],M.bronze);seam.castShadow=false;}
 const hills=new T.Group();s.add(hills);for(let i=0;i<16;i++){const m=ellipsoid(hills,[-60+i*8,-2,-166-Math.sin(i*3)*9],[12,8+Math.sin(i)*3,14],M.green,false);m.castShadow=false;}
 const treePositions=[[-10,6,2.2],[13,3,2.8],[-9,-8,2.3],[14,-14,2],[-11,-32,2.3],[14,-37,2.4],[-10,-64,2.1],[14,-68,2],[-10,-96,2.1],[13,-104,2.4],[-9,-125,2.1],[13,-137,2.4]];
 for(const [x,z,size]of treePositions)cypress(s,x,z,size);
 const leavesGeo=new T.IcosahedronGeometry(1,1),hedges=new T.InstancedMesh(leavesGeo,M.leaf,150),obj=new T.Object3D();for(let i=0;i<150;i++){const side=i%2?-1:1;obj.position.set(3+side*(5+Math.sin(i)*.8),.05,-143+i/150*160);obj.scale.set(.8,.40,.65);obj.rotation.set(0,i*.4,0);obj.updateMatrix();hedges.setMatrixAt(i,obj.matrix)}hedges.receiveShadow=true;s.add(hedges);
}
function pool(parent,x,z,w=3,h=10){box(parent,[x,-.07,z],[w+.3,.20,h+.3],M.marble);const water=new T.ShaderMaterial({transparent:true,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float uTime; void main(){float wave=sin(vUv.y*75.+uTime*.8+sin(vUv.x*31.+uTime*.25))*sin(vUv.x*45.+uTime*.4);vec3 c=mix(vec3(.24,.39,.32),vec3(.64,.68,.47),vUv.y);c+=pow(max(0.,wave),9.)*.19;gl_FragColor=vec4(c,.88);}'});const plane=mesh(new T.PlaneGeometry(w,h),water,parent,[x,.045,z]);plane.rotation.x=-Math.PI/2;plane.castShadow=false;plane.receiveShadow=false;return water}
let waters=[];
function makeGarden(){const g=new T.Group();g.position.set(4,0,0);scene.add(g);worldGroups.push({group:g,z:0});gate=gates(g);for(let i=0;i<4;i++)box(g,[0,-.04-i*.035,4.5+i*1.2],[8.4+i*.5,.14,1.25],M.marble);waters.push(pool(g,-5.7,7.8,2.1,11),pool(g,5.7,7.8,2.1,11));for(const side of[-1,1]){tree(g,side*7.7,-2,3.3,true);tree(g,side*10.3,8,2.1,true);vase(g,[side*4.6,.0,3.3],1.35);const flower=laurel(g,.6);flower.position.set(side*4.6,1.4,3.3);flower.rotation.x=-.1;}
 const farTemple=temple(g,7,5,4);farTemple.position.set(0,0,-19);farTemple.scale.setScalar(.65);
 // Floating specks are actual points in world space, not a screen overlay.
}
const stonePositions=[[-1.4,.54,.7],[1.5,.975,.20],[4.4,1.41,-.30]];
function makeWork(){const g=new T.Group();g.position.set(3,0,-34);scene.add(g);worldGroups.push({group:g,z:-34});
 const shape=new T.Shape();shape.moveTo(-4,-.1);shape.lineTo(6,-.1);shape.lineTo(6,1.4);shape.lineTo(-4,-.1);const slope=mesh(new T.ExtrudeGeometry(shape,{depth:4.2,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:2}),M.limestone,g,[-.1,0,-2.1]);
 for(let i=0;i<19;i++){const x=-3.8+i*.51,z=-1.8;box(g,[x,(x+4)*.15+.04,z],[.43,.05,.06],M.bronze);box(g,[x,(x+4)*.15+.04,1.9],[.43,.05,.06],M.bronze)}
 stonePositions.forEach((p,i)=>{const radius=i===0?.82:.73;const stone=boulder(g,[p[0],p[1]+radius,p[2]],radius);stone.userData.jobIndex=i;clickables.push(stone);stones.push(stone);const halo=ring(g,[p[0],p[1]-.08,p[2]],radius*1.17,.018);halo.rotation.x=-Math.PI/2;stoneRings.push(halo)});
 worker=sisyphus();worker.root.position.set(-3.05,.26,1.0);g.add(worker.root);
 for(const side of[-1,1]){column(g,side*5.6,-2.9,3.6,M.pale);vase(g,[side*4.9,0,3],1.15)}
 const pathArch=temple(g,6,4.3,2.5);pathArch.position.set(2,1,-7);pathArch.scale.setScalar(.64);
 tree(g,-6,-4,2.5);tree(g,7,-2,2.6,true);return g;
}
function makeSparks(parent){const geometry=new T.BufferGeometry(),p=new Float32Array(60*3);geometry.setAttribute('position',new T.BufferAttribute(p,3));const material=new T.PointsMaterial({color:0xffcf78,size:.043,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false});const points=new T.Points(geometry,material);parent.add(points);return points}
function makeCraft(){const g=new T.Group();g.position.set(3,0,-66);scene.add(g);worldGroups.push({group:g,z:-66});dais(g,4.5);smith=hephaestus();smith.root.position.set(.55,.15,.4);smith.root.rotation.y=-.35;smith.root.scale.setScalar(1.45);g.add(smith.root);
 const t=temple(g,8,5.3,4.2);t.position.z=-2.5;for(let i=0;i<5;i++){const y=.5+i*.24;box(g,[-2.5,y,-1.7],[1.4,.20,.9],M.pale)}const table=box(g,[2.8,1.1,-.6],[2.2,.2,1.2],M.pale);for(const x of[2.1,3.5])box(g,[x,.55,-.6],[.18,1.1,.9],M.limestone);vase(g,[2.5,1.2,-.6],.85);vase(g,[3.2,1.2,-.45],.6);const finishedShield=cyl(g,[3.1,1.6,-.8],.45,.45,.08,M.bronze);finishedShield.rotation.x=.25;ring(g,[3.1,1.6,-.73],.40,.016);
 const fire=cyl(g,[-2.5,1.67,-1.7],.46,.36,.18,M.bronze);for(let i=0;i<7;i++)ellipsoid(g,[-2.5+Math.sin(i*4)*.24,1.82,-1.7+Math.cos(i*4)*.24],[.12,.11,.12],M.coal,false);const firelight=new T.PointLight(0xffb14d,11,7,2);firelight.position.set(-2.5,2,-1.7);g.add(firelight);sparks=makeSparks(g);sparks.position.set(.95,1.7,1.53);g.userData.firelight=firelight;tree(g,6,-4,2.2);return g}
function makeTrust(){const g=new T.Group();g.position.set(3,0,-98);scene.add(g);worldGroups.push({group:g,z:-98});dais(g,4.2);messenger=hermes();messenger.root.position.set(.3,.2,0);messenger.root.scale.setScalar(1.62);messenger.root.rotation.y=-.20;g.add(messenger.root);for(const side of[-1,1])column(g,side*3.5,-2.4,4.4);const lintel=box(g,[0,5.05,-2.4],[8.3,.35,1],M.marble);
 for(let i=0;i<3;i++){const a=-.8+i*.8,x=Math.sin(a)*2.5,y=2.8+Math.cos(a)*1.4;const orb=new T.Group();orb.position.set(x,y,-.65);g.add(orb);ring(orb,[0,0,0],.34,.035,M.bronze);const centre=mesh(new T.OctahedronGeometry(.15),M.gold,orb);promiseOrbs.push(orb);tube(g,[[x,y,-.65],[x*.7,y-.3,-.7],[.3,2.5,-.4]],.012,M.bronze)}
 tree(g,-5.8,-4,2.5,true);tree(g,5.5,-4,2.4);vase(g,[-3,0,2.7],1.5);return g}
function makeSupport(){const g=new T.Group();g.position.set(3,0,-130);scene.add(g);worldGroups.push({group:g,z:-130});dais(g,4.7);guardian=athena();guardian.root.scale.setScalar(1.65);guardian.root.position.set(.3,.17,0);guardian.root.rotation.y=-.14;g.add(guardian.root);const t=temple(g,8.3,5.5,3.5);t.position.z=-3;tree(g,-5.8,-.5,2.6,true);tree(g,5.8,-1.8,2.6,true);for(const x of[-3,3]){vase(g,[x,0,2.6],1.4);const olive=laurel(g,.45);olive.position.set(x,1.5,2.6)}return g}
function pollen(){const p=new Float32Array(500*3);for(let i=0;i<500;i++){p[i*3]=(Math.random()-.5)*28+3;p[i*3+1]=Math.random()*10;p[i*3+2]=20-Math.random()*165}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));const m=new T.PointsMaterial({color:0xf7ddb2,size:.034,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending});const points=new T.Points(g,m);scene.add(points);return points}
const cameraKeys=[
 [0,[-3.2,4.6,21],[2,3.5,0]],
 [.055,[-1.8,4.3,15],[4,3.4,-3]],
 [.15,[4,3.5,1],[4,2.5,-20]],
 [.22,[-2.6,4.5,-20],[1,1.9,-34]],
 [.39,[-2.1,4.4,-21],[1,1.9,-34]],
 [.465,[-2.6,3.8,-55],[.2,1.9,-66]],
 [.60,[-2.0,3.7,-55.8],[.2,1.9,-66]],
 [.665,[-2.8,3.7,-87],[.3,2.1,-98]],
 [.80,[-2.2,3.8,-88],[.3,2.1,-98]],
 [.87,[-2.8,4.1,-118],[.25,2.4,-130]],
 [1,[-1.8,4.0,-119],[.25,2.4,-130]]
];
const cameraPosition=new T.Vector3(),cameraTarget=new T.Vector3();
function poseAt(p){let i=0;while(i<cameraKeys.length-2&&p>cameraKeys[i+1][0])i++;const a=cameraKeys[i],b=cameraKeys[i+1],t=smooth(a[0],b[0],p);for(let n=0;n<3;n++){cameraPosition.setComponent(n,lerp(a[1][n],b[1][n],t));cameraTarget.setComponent(n,lerp(a[2][n],b[2][n],t))}if(innerWidth<=760){cameraPosition.x+=2.0;cameraPosition.y+=.9;cameraPosition.z+=2.5;cameraTarget.x+=1.2;cameraTarget.y+=1.0}if(!paused){cameraPosition.x+=mouse.x*.22;cameraPosition.y+=mouse.y*.10}camera.position.copy(cameraPosition);camera.lookAt(cameraTarget)}
function currentChapter(p){return p<.19?0:p<.43?1:p<.635?2:p<.835?3:4}
function panelAlpha(i,p){const bands=[[0,0,.055,.15],[.205,.25,.385,.43],[.45,.49,.595,.635],[.65,.69,.795,.835],[.85,.89,1.1,1.2]],b=bands[i];return(i===0?1:smooth(b[0],b[1],p))*(1-smooth(b[2],b[3],p))}
function updatePanels(){const chapter=currentChapter(progress);if(chapter!==activeChapter||!stage.dataset.activeChapter){activeChapter=chapter;stage.dataset.activeChapter=chapter;$('#journey-number').textContent=String(chapter).padStart(2,'0');$('#journey-object-name').firstChild.textContent=names[chapter][0];$('#journey-object-note').textContent=names[chapter][1];$('#scroll-instruction').innerHTML=chapter===0?'SCROLL TO OPEN THE GATES <span>↓</span>':chapter===4?'YOUR NEXT CHAPTER BELOW <span>↓</span>':'SCROLL TO CONTINUE THE JOURNEY <span>↓</span>';$$('.journey-chapters [data-travel]').forEach(b=>{const selected=Number(b.dataset.travel)===chapter;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')})}
 $$('.journey-panel').forEach((panel,i)=>{const alpha=paused?(i===chapter?1:0):panelAlpha(i,progress);panel.style.opacity=alpha.toFixed(3);panel.style.transform=`translateY(${(1-alpha)*24}px)`;const visible=alpha>.03;panel.classList.toggle('is-active',visible);panel.setAttribute('aria-hidden',String(!visible));panel.inert=!visible;});
 $('#world-labels').hidden=!(chapter===1&&panelAlpha(1,progress)>.45);$('#journey-progress-fill').style.width=`${progress*100}%`;$('#scene-object-caption').style.opacity=paused?1:panelAlpha(chapter,progress);
}
const point=new T.Vector3();
function updateLabels(){if($('#world-labels').hidden)return;stones.forEach((stone,i)=>{stone.getWorldPosition(point);point.y+=1.23;point.project(camera);const x=(point.x*.5+.5)*canvas.clientWidth,y=(-point.y*.5+.5)*canvas.clientHeight;const label=$(`[data-stone="${i}"]`);label.style.left=`${x}px`;label.style.top=`${y}px`;label.style.visibility=point.z<1&&x>20&&x<canvas.clientWidth-20&&y>80&&y<canvas.clientHeight-90?'visible':'hidden'})}
function updateScroll(){const range=section.offsetHeight-innerHeight;targetProgress=clamp(-section.getBoundingClientRect().top/range)}
window.addEventListener('scroll',updateScroll,{passive:true});
window.addEventListener('pointermove',e=>{pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2)});
function resize(){if(!renderer)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();updateScroll()}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(stage);
canvas.addEventListener('pointermove',e=>{if(activeChapter!==1)return;const rect=canvas.getBoundingClientRect(),p=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(p,camera);canvas.style.cursor=raycaster.intersectObjects(clickables,false).length?'pointer':'default'});
canvas.addEventListener('click',e=>{if(activeChapter!==1)return;const rect=canvas.getBoundingClientRect(),p=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(p,camera);const hits=raycaster.intersectObjects(clickables,false);if(hits.length)selectStone(hits[0].object.userData.jobIndex)});

function animateSparks(t){const p=sparks.geometry.attributes.position;for(let i=0;i<p.count;i++){const age=(t*.65+i*.071)%1,a=i*2.399;const rise=Math.sin(age*Math.PI);p.setXYZ(i,Math.cos(a)*age*.75,rise*.9,Math.sin(a)*age*.65)}p.needsUpdate=true;sparks.material.opacity=Math.pow((Math.sin(t*2.8)+1)/2,4)*.9+craftPulse*.2}
let visible=true;new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(section);
let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;if(document.hidden||!visible||document.querySelector('#modal')?.open)return;if(!paused){time+=dt;mouse.lerp(pointer,.035)}updateScroll();progress=paused?targetProgress:lerp(progress,targetProgress,1-Math.exp(-dt*9));if(Math.abs(progress-targetProgress)<.00003)progress=targetProgress;updatePanels();poseAt(paused?anchors[activeChapter]:progress);gate.open(smooth(.045,.14,progress));
 const worldZ=cameraTarget.z;sun.position.set(-12,22,worldZ+13);sun.target.position.set(3,0,worldZ);for(const {group,z}of worldGroups)group.visible=Math.abs(z-worldZ)<44;
 if(!paused){worker.animate(time);smith.animate(time);messenger.animate(time);guardian.animate(time);waters.forEach(m=>m.uniforms.uTime.value=time);animateSparks(time);craftPulse=Math.max(0,craftPulse-dt*.6);}
 const climb=smooth(.23,.40,progress)*.45;const desired=stonePositions[selectedJob];worker.root.position.x=lerp(worker.root.position.x,desired[0]+climb-1.65,.045);worker.root.position.y=lerp(worker.root.position.y,desired[1]+climb*.15-.35,.045);worker.root.position.z=lerp(worker.root.position.z,desired[2]+.2,.045);
 stones.forEach((s,i)=>{const shift=i===selectedJob?climb:0;s.position.x=stonePositions[i][0]+shift;s.position.y=stonePositions[i][1]+(i===0?.82:.73)+shift*.15;s.rotation.z=-shift/(i===0?.82:.73);stoneRings[i].position.x=s.position.x;stoneRings[i].position.y=stonePositions[i][1]-.04+shift*.15;stoneRings[i].material=i===selectedJob?M.gold:M.bronze;stoneRings[i].scale.setScalar(i===selectedJob?1+Math.sin(time*1.2)*.045:1)});
 promiseOrbs.forEach((o,i)=>{o.scale.setScalar(i<promiseCount?1.12:1);o.children[1].material=i<promiseCount?M.gold:M.pale;if(!paused)o.children[1].rotation.y=time*.45;});
 updateLabels();renderer.render(scene,camera);
}
try{renderer=makeRenderer(canvas);scene=new T.Scene();const sky=skyTexture();scene.background=sky;const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(sky);scene.environment=env.texture;scene.fog=new T.FogExp2(0xd5d2b9,.019);camera=new T.PerspectiveCamera(43,1,.1,240);sun=lightScene(scene);ground(scene);makeGarden();makeWork();makeCraft();makeTrust();makeSupport();pollen();resize();updateScroll();progress=targetProgress;poseAt(progress);renderer.render(scene,camera);$('#journey-loading').classList.add('loaded');canvas.dataset.ready='true';requestAnimationFrame(frame)}catch(err){console.error('Cinematic scene unavailable',err);document.body.classList.add('no-webgl');stage.insertAdjacentHTML('afterbegin','<div class="cinema-fallback" aria-hidden="true"></div>');$('#scroll-instruction').textContent='SCROLL TO BROWSE WORK';$('#journey-loading').classList.add('loaded')}

function celebrate(c){const r=makeRenderer(c),s=new T.Scene();s.background=new T.Color(0x49634c);s.fog=new T.FogExp2(0x49634c,.035);s.environment=scene?.environment||null;const cam=new T.PerspectiveCamera(37,1,.1,80);cam.position.set(0,3.2,10);cam.lookAt(-1.3,2,0);const light=lightScene(s);light.intensity=3;const floor=mesh(new T.CircleGeometry(14,80),M.green,s,[1,-.2,0]);floor.rotation.x=-Math.PI/2;const podium=new T.Group();podium.position.x=1.55;s.add(podium);dais(podium,2.6);const goddess=athena();goddess.root.scale.setScalar(1.55);goddess.root.position.y=.16;podium.add(goddess.root);for(const side of[-1,1])column(podium,side*3,-3,5,M.pale);const victory=laurel(podium,2.6);victory.position.set(0,2.3,-.7);const g=new T.BufferGeometry(),count=180,pos=new Float32Array(count*3),starts=[];for(let i=0;i<count;i++)starts.push([Math.random()*Math.PI*2,Math.random(),Math.random()*2]);g.setAttribute('position',new T.BufferAttribute(pos,3));const particles=new T.Points(g,new T.PointsMaterial({color:0xf1d390,size:.035,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));s.add(particles);let running=true,t=0,previous=performance.now();const size=()=>{r.setSize(c.clientWidth,c.clientHeight,false);cam.aspect=c.clientWidth/c.clientHeight;cam.position.z=c.clientWidth<650?13:11.8;cam.lookAt(c.clientWidth<650?-.5:-.35,2.2,0);cam.updateProjectionMatrix()};const ro=new ResizeObserver(size);ro.observe(c);size();function loop(now){if(!running)return;requestAnimationFrame(loop);const dt=Math.min((now-previous)/1000,.04);previous=now;if(!paused)t+=dt;goddess.animate(t,smooth(0,2,t));victory.rotation.z=Math.sin(t*.22)*.025;podium.rotation.y=Math.sin(t*.3)*.07;for(let i=0;i<count;i++){const [a,start,rad]=starts[i],phase=(start+t*.08)%1;pos[i*3]=1.5+Math.cos(a+t*.1)*(1.3+rad);pos[i*3+1]=phase*7;pos[i*3+2]=Math.sin(a+t*.1)*(1.3+rad)}g.attributes.position.needsUpdate=true;r.render(s,cam);c.dataset.ready='true'}requestAnimationFrame(loop);return()=>{running=false;ro.disconnect();r.dispose();r.forceContextLoss()}}
window.addEventListener('request-celebration',e=>{celebrateDispose?.();try{celebrateDispose=celebrate(e.detail)}catch(err){console.warn('Celebration rendering unavailable',err)}});
window.addEventListener('gallery-close',()=>{celebrateDispose?.();celebrateDispose=null});
