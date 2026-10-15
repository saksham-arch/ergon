// Mock content for the hall. Workers are the figures painted on the frieze, in
// the order they run around the vase (u = 0 at the seam).

export const FIGURES = [
  { id: 'sisyphus', src: '/art/sisyphus.jpg', wide: true, greek: 'ΣΙΣΥΦΟΣ', trade: 'Sisyphus', hi: 'सिसिफ़स' },
  { id: 'carpenter', src: '/art/carpenter.jpg', greek: 'ΤΕΚΤΩΝ', trade: 'Carpenter', hi: 'बढ़ई' },
  { id: 'mason', src: '/art/mason.jpg', greek: 'ΛΙΘΟΛΟΓΟΣ', trade: 'Mason', hi: 'राजमिस्त्री' },
  { id: 'electrician', src: '/art/electrician.jpg', greek: 'ΗΛΕΚΤΡΟΛΟΓΟΣ', trade: 'Electrician', hi: 'बिजली मिस्त्री' },
  { id: 'painter', src: '/art/painter.jpg', greek: 'ΧΡΩΜΑΤΙΣΤΗΣ', trade: 'Painter', hi: 'पेंटर' },
  { id: 'plumber', src: '/art/plumber.jpg', greek: 'ΥΔΡΑΥΛΙΚΟΣ', trade: 'Plumber', hi: 'प्लंबर' },
  { id: 'sweeper', src: '/art/sweeper.jpg', greek: 'ΣΑΡΩΤΡΙΑ', trade: 'Sweeper', hi: 'सफ़ाई कर्मचारी' },
  { id: 'headload', src: '/art/headload.jpg', greek: 'ΑΧΘΟΦΟΡΟΣ', trade: 'Site labourer', hi: 'मज़दूर' },
  { id: 'hawker', src: '/art/hawker.jpg', greek: 'ΠΩΛΗΤΗΣ', trade: 'Fruit hawker', hi: 'फल विक्रेता' },
]

// Texture-space slot widths (of 4096) for the frieze: the wide Sisyphus scene,
// then the eight workers.
export const SLOT_WIDE = 896
export const SLOT = 400

// The record each figure opens when you touch it.
export const RECORDS = {
  sisyphus: {
    name: 'Sisyphus of Corinth',
    trade: 'Boulder, uphill',
    years: '∞',
    place: 'Tartarus',
    langs: 'Ancient Greek',
    vouched: 0,
    note: 'Pushed the same stone every day. Nobody ever wrote down a single one.',
    rate: 'Unpaid',
    avail: 'Always',
  },
  carpenter: {
    name: 'Imran Shaikh',
    trade: 'Carpenter · furniture and shuttering',
    years: '16 years',
    place: 'Kurla naka, Mumbai',
    langs: 'Hindi, Urdu, Marathi',
    vouched: 52,
    note: 'Modular kitchens, door frames, site shuttering. Has his own drill and planer.',
    rate: '₹1,100 / day',
    avail: 'Free from Monday',
  },
  mason: {
    name: 'Sunita Devi',
    trade: 'Mason · brickwork and plaster',
    years: '11 years',
    place: 'Laxmi Nagar chowk, Delhi',
    langs: 'Hindi, Bhojpuri',
    vouched: 38,
    note: 'Led a crew of four on a three-storey build. Known for clean plaster corners.',
    rate: '₹950 / day',
    avail: 'Available tomorrow',
  },
  electrician: {
    name: 'Ravi Kumar',
    trade: 'Electrician · house wiring',
    years: '14 years',
    place: 'KR Market, Bengaluru',
    langs: 'Kannada, Tamil, Hindi',
    vouched: 61,
    note: 'Concealed wiring, DB boards, inverter installs. Carries his own tester and ladder.',
    rate: '₹1,200 / day',
    avail: 'Available today',
  },
  painter: {
    name: 'Mohammed Arif',
    trade: 'Painter · interiors and texture',
    years: '9 years',
    place: 'Thane station naka',
    langs: 'Hindi, Marathi',
    vouched: 27,
    note: 'Putty, primer, two coats. Texture walls on request. Brings drop sheets.',
    rate: '₹850 / day',
    avail: 'Available today',
  },
  plumber: {
    name: 'Gurpreet Singh',
    trade: 'Plumber · fittings and leaks',
    years: '20 years',
    place: 'Sector 17, Chandigarh',
    langs: 'Punjabi, Hindi',
    vouched: 74,
    note: 'CPVC and GI lines, bathroom fittings, overhead tank work.',
    rate: '₹1,000 / day',
    avail: 'Mornings only',
  },
  sweeper: {
    name: 'Lakshmi Amma',
    trade: 'Housekeeping · offices and sites',
    years: '7 years',
    place: 'Guindy, Chennai',
    langs: 'Tamil, Telugu',
    vouched: 19,
    note: 'Post-construction clean-up and office housekeeping. Prefers day shifts.',
    rate: '₹700 / day',
    avail: 'Free this week',
  },
  headload: {
    name: 'Kamla Bai',
    trade: 'Site labourer · material handling',
    years: '12 years',
    place: 'Naroda naka, Ahmedabad',
    langs: 'Gujarati, Hindi',
    vouched: 33,
    note: 'Material handling and mixing on residential sites. Registered with her welfare board.',
    rate: '₹650 / day',
    avail: 'Available today',
  },
  hawker: {
    name: 'Bablu Yadav',
    trade: 'Fruit hawker · seasonal',
    years: '8 years',
    place: 'Sealdah, Kolkata',
    langs: 'Bengali, Hindi',
    vouched: 12,
    note: 'Runs a handcart in the mornings. Looking for afternoon loading work.',
    rate: '₹600 / day',
    avail: 'Afternoons',
  },
}

export const JOBS = [
  { what: 'Wall putty and two coats, 2BHK', where: 'Andheri East', km: '1.8 km', when: 'Tomorrow, 8 am – 5 pm', pay: '₹900 / day', days: '4 days', by: 'Verified contractor' },
  { what: 'Concealed wiring, new shop', where: 'Jogeshwari', km: '3.2 km', when: 'Mon – Sat, 9 am – 6 pm', pay: '₹1,150 / day', days: '6 days', by: 'Verified business' },
  { what: 'Loading at wholesale market', where: 'Vashi APMC', km: '6.5 km', when: 'Tonight, 10 pm – 4 am', pay: '₹700 / shift', days: '1 night', by: 'Repeat employer' },
]

export const SCHEMES = [
  { name: 'e-Shram card', what: 'A national ID for unorganised workers. The door to most other schemes.', need: 'Aadhaar, phone linked to Aadhaar, bank account' },
  { name: 'Construction welfare board', what: 'State BOCW boards pay for tools, children’s education and accident cover.', need: 'Proof of 90 days of building work in a year' },
  { name: 'PM-SYM pension', what: '₹3,000 a month after 60, for a small monthly contribution.', need: 'Age 18–40, income under ₹15,000 a month' },
  { name: 'Ayushman Bharat', what: 'Hospital cover for eligible families, cashless at listed hospitals.', need: 'Ration card or eligibility check by phone' },
]
