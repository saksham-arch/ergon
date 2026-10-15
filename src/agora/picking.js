// Hit-test the actual rendered flower positions, in CSS pixels.
export function pickFlower(point,targets){
 let best=null,score=Infinity
 for(const target of targets){
  const {head,base,radius,id}=target
  const headDistance=Math.hypot(point.x-head.x,point.y-head.y)
  if(headDistance<=Math.max(24,radius+10)&&headDistance<score){best=id;score=headDistance}
 }
 if(best!==null)return best
 for(const {id,head,base} of targets){
  const dx=head.x-base.x,dy=head.y-base.y,length=dx*dx+dy*dy
  const t=Math.max(0,Math.min(1,((point.x-base.x)*dx+(point.y-base.y)*dy)/(length||1)))
  const distance=Math.hypot(point.x-base.x-t*dx,point.y-base.y-t*dy)
  if(distance<=16&&distance<score){best=id;score=distance}
 }
 return best
}
