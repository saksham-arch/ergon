// Published addresses are the source of truth; coordinates are approximate area pins.
// Directions deliberately resolve the address, not the approximate coordinates.
const labour='https://labour.maharashtra.gov.in/en/contact-us'
const REAL_PLACES=[
 {id:'seepz',kind:'work',name:'SEEPZ · industrial district',hi:'सीप्ज़ · औद्योगिक क्षेत्र',category:'Private work district',area:'Andheri East',lngLat:[72.8727,19.1264],address:'SEEPZ Special Economic Zone, Andheri East, Mumbai 400096',description:'An industrial district with private businesses. Use the official directory to research employers; this pin does not advertise a vacancy or guarantee entry.',source:'https://seepz.gov.in/'},
 {id:'labour',kind:'rights',name:'Commissioner of Labour',hi:'श्रम आयुक्त कार्यालय',category:'Labour law office',area:'Bandra Kurla Complex',lngLat:[72.8558,19.0606],address:'Kamgar Bhavan, 4th Floor, C-20, E Block, opposite Reserve Bank, Bandra Kurla Complex, Bandra East, Mumbai 400051',description:'State labour department office. Check its official contact information for the office relevant to your workplace and enquiry.',source:labour},
 {id:'construction',kind:'rights',name:'Construction Workers Welfare Board',hi:'निर्माण कामगार कल्याण मंडल',category:'Worker support',area:'Bandra Kurla Complex',lngLat:[72.8581,19.0618],address:'5th Floor, MMTC House, Plot C-22, E Block, Bandra Kurla Complex, Bandra East, Mumbai 400051',description:'Contact point for the Maharashtra Building and Other Construction Workers Welfare Board. Check registration and benefit information before visiting.',source:labour},
 {id:'central-labour',kind:'rights',name:'Central Labour Commissioner office',hi:'केंद्रीय श्रम आयुक्त कार्यालय',category:'Labour law office',area:'Sion',lngLat:[72.8816,19.0538],address:'Shram Raksha Bhavan, opposite Priyadarshini, Shiv Shrushti Road, Eastern Express Highway, Sion, Mumbai 400022',description:'Central labour administration office. Contact the office to confirm whether your employment matter falls within its jurisdiction.',source:'https://clc.gov.in/clc/regional-offices/mumbai'},
 {id:'court',kind:'trust',name:'Central Industrial Tribunal',hi:'केंद्रीय औद्योगिक न्यायाधिकरण',category:'Court',area:'Sion',lngLat:[72.8807,19.0529],address:'Shram Raksha Bhavan, Eastern Express Highway, Sion, Mumbai 400022',description:'Central Government Industrial Tribunal-cum-Labour Court, Mumbai. Consult the official court directory for the appropriate bench and contact details.',source:'https://cgit.labour.gov.in/whos-who'},
 {id:'career',kind:'craft',name:'Career Centre for Differently Abled',hi:'दिव्यांगजन करियर सेवा केंद्र',category:'Government career support',area:'Chunabhatti',lngLat:[72.8755,19.0504],address:'NSTI Campus, V. N. Purav Marg, Chunabhatti, Mumbai 400022',description:'National Career Service Centre for Differently Abled. A government employment-support contact for people with disabilities; this is not a government vacancy listing.',source:'https://dbtdge.ncs.gov.in/contact-us'},
 {id:'welfare',kind:'rights',name:'Maharashtra Labour Welfare Board',hi:'महाराष्ट्र कामगार कल्याण मंडल',category:'Worker support',area:'Prabhadevi',lngLat:[72.8347,19.0148],address:'Hutatma Babu Genu, Mumbai Girni Kamgar Krida Bhavan, 615 Senapati Bapat Marg, Prabhadevi, Mumbai 400013',description:'State worker welfare board. Find the board’s official contact details and ask about the services applicable to you.',source:labour},
].map((p,i)=>({...p,key:p.id,copy:i,height:3.5}))

const DEMO_TYPES=[
 ['work','Private work meeting point','निजी काम मिलने का स्थान','Private work'],
 ['craft','Government work desk','सरकारी काम केंद्र','Government work'],
 ['trust','Labour court','श्रम न्यायालय','Court'],
 ['rights','Labour support office','श्रम सहायता कार्यालय','Labour support'],
]
const DEMO_PLACES=DEMO_TYPES.flatMap(([kind,name,hi,category],type)=>Array.from({length:8},(_,i)=>{
 const angle=(type+i*4)*Math.PI/8,radius=.009+i*.004
 return {id:`demo-${kind}-${i}`,kind,key:`demo-${kind}-${i}`,copy:i,height:3.5,demo:true,
 name:`${name} ${i+1}`,hi:`${hi} ${i+1}`,category,area:'Andheri · Demo',
 lngLat:[72.86542+Math.cos(angle)*radius,19.11161+Math.sin(angle)*radius],
 address:`${['Market Square','Station Road','Workshop Lane','Garden Junction','East Arcade','Canal Road','Central Square','Depot Lane'][i]} · Andheri`,
 description:{work:'Meet nearby employers and explore private work opportunities.',craft:'Explore public maintenance and government project work.',trust:'A place to seek guidance on workplace disputes and unpaid wages.',rights:'Find support with worker rights, registration and welfare schemes.'}[kind],source:null}
}))
export const PLACES=[...REAL_PLACES,...DEMO_PLACES]
