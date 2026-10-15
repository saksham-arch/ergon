// Match the painted texture coordinates, including the wrapped seam.
export function figureAtUV(uv, ranges, band) {
 if(!uv||!ranges||!band||!Number.isFinite(uv.x)||!Number.isFinite(uv.y))return -1
 const low=Math.min(...band),high=Math.max(...band)
 if(uv.y<low||uv.y>high)return -1
 const u=((uv.x%1)+1)%1
 return ranges.findIndex(([a,b])=>u>=a&&u<b)
}
export const isTap=(delta,moved)=>delta<=6&&moved<=6
