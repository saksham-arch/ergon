// These are fictional map destinations, not addresses of actual offices or courts.
export const DESTINATIONS = [
 {id:'work',label:'Private Work',labelHi:'निजी काम',sector:'private',body:'Explore example work from households, shops and private contractors. Compare pay, hours and terms before choosing a job.',bodyHi:'घरों, दुकानों और निजी ठेकेदारों के नमूना काम देखें। मज़दूरी, समय और शर्तों की तुलना करें।'},
 {id:'craft',label:'Government Work',labelHi:'सरकारी काम',sector:'government',body:'Explore example public-site maintenance and project work. These are fictional opportunities, not official vacancies. Prepare a work card to show your skills.',bodyHi:'सार्वजनिक स्थलों के रखरखाव और परियोजनाओं के नमूना काम देखें। ये आधिकारिक रिक्तियाँ नहीं हैं। अपना हुनर दिखाने के लिए काम कार्ड बनाएँ।'},
 {id:'trust',label:'Court',labelHi:'न्यायालय',body:'Review an offer or prepare a wage reminder with your agreed rate and unpaid days. This desk prepares a draft; it does not file a case.',bodyHi:'प्रस्ताव जाँचें या तय दर और बकाया दिनों से मज़दूरी याद-दिहानी बनाएँ। यहाँ मसौदा तैयार होता है, मुक़दमा दर्ज नहीं होता।'},
 {id:'rights',label:'Labour Law Office',labelHi:'श्रम कानून कार्यालय',body:'Find worker-support schemes, document checklists and official next steps. Use the wage-reminder tool when payment is overdue.',bodyHi:'कामगार योजनाएँ, ज़रूरी काग़ज़ और आधिकारिक अगले कदम देखें। बकाया भुगतान के लिए याद-दिहानी बनाएँ।'},
]
export const destinationOf=id=>DESTINATIONS.find(d=>d.id===id)
