// Decision aid: sample benchmarks and questions, never a legal minimum or safety verdict.
export const LOCAL_RATE = { mason:900,painter:850,electrician:1000,plumber:950,carpenter:1000,helper:650,housekeeping:600,loading:700 }
export const PRESETS = {
 fair:{trade:'plumber',pay:'1000',unit:'day',hours:'8',payday:'daily',address:'yes',fee:'0',written:'yes',verified:'yes'},
 doubt:{trade:'mason',pay:'700',unit:'day',hours:'11',payday:'end',address:'yes',fee:null,written:'unknown',verified:'unknown'},
 scam:{trade:'helper',pay:'2600',unit:'day',hours:'8',payday:'end',address:'no',fee:'5000',written:'no',verified:'unknown'},
}
const known = x => x === true || x === 'yes'
const unknown = x => x === null || x === undefined || x === 'unknown'
export function numeric(value, min, max) {
 if(value === null || value === undefined || String(value).trim()==='') return null
 const n=Number(value)
 return Number.isFinite(n)&&n>=min&&n<=max?n:null
}
export function payBand(pay,reference) {
 if(pay < reference*.75) return 'wellBelow'
 if(pay < reference*.9) return 'below'
 if(pay <= reference*1.1) return 'near'
 if(pay <= reference*2) return 'above'
 return 'wellAbove'
}
export function weighOffer(o) {
 const errors={}
 const pay=numeric(o.pay,.01,10000000), hours=o.hours===null?null:numeric(o.hours,1,24), fee=o.fee===null?null:numeric(o.fee,0,10000000)
 if(pay===null) errors.pay='payError'
 if(o.hours!==null && hours===null) errors.hours='hoursError'
 if(o.fee!==null && fee===null) errors.fee='feeError'
 if(!['day','shift','job','month'].includes(o.unit)) errors.unit='unit'
 const tokens=[]
 const add=(id,side,w,en,hi)=>tokens.push({id,side,w,label:en,hi})
 const ref=LOCAL_RATE[o.trade]??800
 const band=pay===null?null:payBand(pay,ref)
 if(o.unit!=='day') add('pay','risk',0,'Daily comparison unavailable for this pay unit. Ask how the amount and scope were agreed.','इस इकाई की दैनिक दर से तुलना नहीं हो सकती। रकम और काम का दायरा पूछें।')
 else if(pay!==null) {
 const descriptions={
 wellBelow:['Pay is well below the sample daily benchmark. Ask why and discuss the rate.','मज़दूरी नमूना दैनिक दर से बहुत कम है। कारण और दर पर बात करें।'],
 below:['Pay is below the sample daily benchmark. Discuss the rate.','मज़दूरी नमूना दैनिक दर से कम है। दर पर बात करें।'],
 near:['Pay is near the sample daily benchmark. This does not establish a legal wage or guarantee payment.','मज़दूरी नमूना दैनिक दर के पास है। इससे कानूनी दर या भुगतान की गारंटी तय नहीं होती।'],
 above:['Pay is above the sample daily benchmark. Confirm the scope and payment timing.','मज़दूरी नमूना दैनिक दर से अधिक है। काम और भुगतान का समय पूछें।'],
 wellAbove:['Pay is far above the sample benchmark. Independently confirm the offer; the amount alone does not prove fraud.','रकम नमूना दर से बहुत अधिक है। प्रस्ताव की अलग से पुष्टि करें; रकम अकेले धोखाधड़ी साबित नहीं करती।'],
 }
 add('pay',band==='near'||band==='above'?'fair':'risk',band==='wellBelow'||band==='wellAbove'?2:1,...descriptions[band])
 }
 if(hours===null) add('hours','risk',1,'Working hours are unknown. Ask for start, finish, breaks and any additional pay.','काम के घंटे अज्ञात हैं। शुरुआत, समाप्ति, आराम और अतिरिक्त भुगतान पूछें।')
 else if(hours>9) add('hours','risk',1,'This is a long working day. Ask about breaks, extra hours and the applicable overtime rules.','काम का दिन लंबा है। आराम, अतिरिक्त घंटे और लागू ओवरटाइम नियम पूछें।')
 else add('hours','fair',1,'Hours are stated. Confirm breaks and any extra hours in writing.','घंटे दिए गए हैं। आराम और अतिरिक्त घंटे लिखित में तय करें।')
 if(['daily','weekly','monthly'].includes(o.payday)) add('payday','fair',1,'Payment timing is stated; ask for the exact date and method.','भुगतान का समय दिया है; सही तारीख और तरीका पूछें।')
 else add('payday','risk',1,'Payment timing needs clarification. Ask for a date and interim payments.','भुगतान का समय साफ़ करें। तारीख और बीच के भुगतान पूछें।')
 for(const [id,en,hi] of [['address','Site address','काम का पता'],['written','Written terms','लिखित शर्तें'],['verified','Verification assumption','जाँच का अनुमान']]) {
 if(known(o[id])) add(id,'fair',1,`${en}: supplied. Check the underlying evidence.`,`${hi}: दिया गया। संबंधित प्रमाण जाँचें।`)
 else add(id,'risk',id==='address'?2:1,`${en}: ${unknown(o[id])?'unknown':'not supplied'}. Ask before committing.`,`${hi}: ${unknown(o[id])?'अज्ञात':'नहीं दिया'}। तय करने से पहले पूछें।`)
 }
 if(fee>0) add('fee','risk',5,'An upfront fee is a serious warning. Do not transfer money; independently check the employer and terms.','पहले फ़ीस माँगना गंभीर चेतावनी है। पैसे न भेजें; नियोक्ता और शर्तों की स्वतंत्र जाँच करें।')
 else if(fee===null) add('fee','risk',1,'Fees are unknown. Ask whether any payment or deduction is required.','फ़ीस अज्ञात है। कोई भुगतान या कटौती है या नहीं, पूछें।')
 else add('fee','fair',1,'No upfront fee is stated. Confirm there are no unexpected deductions.','पहले फ़ीस नहीं बताई गई। अनजानी कटौती नहीं है, पुष्टि करें।')
 const fair=tokens.filter(t=>t.side==='fair').reduce((a,t)=>a+t.w,0), risk=tokens.filter(t=>t.side==='risk').reduce((a,t)=>a+t.w,0)
 const hardWarning=fee>0
 const tone=Object.keys(errors).length?'invalid':hardWarning?'bad':risk?'mid':'good'
 const labels={invalid:['Check the inputs','जानकारी जाँचें'],bad:['Serious warning','गंभीर चेतावनी'],mid:['Questions to ask','पूछने के सवाल'],good:['Clearer terms','अधिक स्पष्ट शर्तें']}
 return {errors,valid:!Object.keys(errors).length,tokens,fair,risk,hardWarning,band,reference:ref,verdict:{tone,word:labels[tone][0],hi:labels[tone][1],line:'This checks stated terms only; it cannot guarantee safety or payment.',lineHi:'यह केवल बताई शर्तें जाँचता है; सुरक्षा या भुगतान की गारंटी नहीं है।'}}
}
export { matchSchemes, SCHEMES } from '../domain/schemes.js'
