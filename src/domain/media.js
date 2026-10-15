let database
function db(){
 if(!database)database=new Promise((resolve,reject)=>{const req=indexedDB.open('ergon-evidence-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('media');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Storage blocked'))})
 return database
}
export async function mediaRead(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('media');const req=tx.objectStore('media').get('card');req.onsuccess=()=>resolve(req.result??{photos:[],audio:null});req.onerror=()=>reject(req.error)})}
export async function mediaWrite(value){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('media','readwrite');tx.objectStore('media').put(value,'card');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
export async function preparePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('type')
 if(file.size>10*1024*1024)throw new Error('size')
 let bitmap
 try{bitmap=await createImageBitmap(file)}catch{throw new Error('decode')}
 try{
  if(bitmap.width*bitmap.height>40000000)throw new Error('pixels')
  const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.round(bitmap.width*ratio);c.height=Math.round(bitmap.height*ratio);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height)
  return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('decode')),'image/jpeg',.86))
 }finally{bitmap.close()}
}
