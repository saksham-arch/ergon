// Mock jobs on the map. x, z are map units (the board is 12 × 12, one unit is
// 0.75 km). Every job is a flower; its colour is its trade.

export const KM = 0.75

export const TRADES = [
  { id: 'mason', label: 'Mason', hi: 'राजमिस्त्री', color: '#c4532a' },
  { id: 'painter', label: 'Painter', hi: 'पेंटर', color: '#d9a43e' },
  { id: 'electrician', label: 'Electrician', hi: 'बिजली मिस्त्री', color: '#4f79b0' },
  { id: 'plumber', label: 'Plumber', hi: 'प्लंबर', color: '#2f8c86' },
  { id: 'carpenter', label: 'Carpenter', hi: 'बढ़ई', color: '#8f5e34' },
  { id: 'helper', label: 'Site helper', hi: 'हेल्पर', color: '#b24c66' },
  { id: 'housekeeping', label: 'Housekeeping', hi: 'सफ़ाई', color: '#8a74c4' },
  { id: 'loading', label: 'Loading', hi: 'लोडिंग', color: '#d0763f' },
]
export const tradeOf = (id) => TRADES.find((t) => t.id === id)

export const KINDS = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'long', label: 'Longer work' },
]

export const JOBS = [
  { id: 'j1', trade: 'painter', kind: 'day', title: 'Wall putty and two coats, 2BHK', employer: 'Shah Interiors', verified: true, hires: 23, pay: 900, unit: 'day', hours: '8 am – 5 pm', start: 'Tomorrow', days: '4 days', x: -1.2, z: 0.8, place: 'Andheri East, near the station', bring: 'Roller and scraper. Paint is provided.' },
  { id: 'j2', trade: 'electrician', kind: 'week', title: 'Concealed wiring for a new shop', employer: 'Kapoor Traders', verified: true, hires: 11, pay: 1150, unit: 'day', hours: '9 am – 6 pm', start: 'Monday', days: '6 days', x: 2.4, z: -1.6, place: 'Jogeshwari market road', bring: 'Tester and your own hand tools.' },
  { id: 'j3', trade: 'loading', kind: 'day', title: 'Unloading grain at the wholesale market', employer: 'Patel & Sons', verified: true, hires: 58, pay: 700, unit: 'shift', hours: '10 pm – 4 am', start: 'Tonight', days: '1 night', x: 4.2, z: 3.5, place: 'APMC gate 3', bring: 'Gloves. Tea and a meal at 1 am.' },
  { id: 'j4', trade: 'mason', kind: 'long', title: 'Brickwork, three-storey building', employer: 'Sai Constructions', verified: true, hires: 40, pay: 950, unit: 'day', hours: '8 am – 5 pm', start: 'Next week', days: '3 months', x: -3.6, z: -2.4, place: 'Plot 14, behind the temple tank', bring: 'Trowel and level. Helmet provided.' },
  { id: 'j5', trade: 'plumber', kind: 'day', title: 'Fix a leaking overhead tank line', employer: 'Mrs. D’Souza (home)', verified: false, hires: 0, pay: 1000, unit: 'job', hours: '11 am, about 3 hours', start: 'Today', days: 'Half day', x: 0.6, z: 2.6, place: 'Lane 4, near the bridge', bring: 'Wrench set and thread tape.' },
  { id: 'j6', trade: 'carpenter', kind: 'week', title: 'Wardrobes and door frames', employer: 'Homecraft Studio', verified: true, hires: 17, pay: 1100, unit: 'day', hours: '9 am – 6 pm', start: 'Wednesday', days: '5 days', x: -4.4, z: 1.9, place: 'Gulmohar Society, B wing', bring: 'Drill and planer. Wood is on site.' },
  { id: 'j7', trade: 'helper', kind: 'day', title: 'Site helper, mixing and carrying', employer: 'Sai Constructions', verified: true, hires: 40, pay: 650, unit: 'day', hours: '8 am – 5 pm', start: 'Tomorrow', days: '1 day', x: -3.1, z: -3.3, place: 'Plot 14, behind the temple tank', bring: 'Closed shoes.' },
  { id: 'j8', trade: 'housekeeping', kind: 'long', title: 'Office housekeeping, day shift', employer: 'Clearline Facilities', verified: true, hires: 64, pay: 16500, unit: 'month', hours: '9 am – 6 pm, Sundays off', start: 'From the 1st', days: 'Ongoing', x: 1.8, z: -3.9, place: 'Tower C, business park', bring: 'Aadhaar copy for the gate pass.' },
  { id: 'j9', trade: 'mason', kind: 'day', title: 'Plaster repair after a leak', employer: 'Mr. Rao (home)', verified: false, hires: 0, pay: 1000, unit: 'day', hours: '9 am – 4 pm', start: 'Tomorrow', days: '1 day', x: 3.3, z: 0.4, place: 'Shanti Nagar, house 22', bring: 'Trowel. Cement is bought.' },
  { id: 'j10', trade: 'painter', kind: 'long', title: 'School repainting, summer break', employer: 'Municipal School No. 7', verified: true, hires: 3, pay: 880, unit: 'day', hours: '8 am – 4 pm', start: 'In two weeks', days: '6 weeks', x: -0.4, z: -4.6, place: 'Station road', bring: 'Nothing. All material provided.' },
  { id: 'j11', trade: 'electrician', kind: 'day', title: 'Inverter and two fans', employer: 'Mehta Medical', verified: true, hires: 6, pay: 1200, unit: 'job', hours: 'After 2 pm', start: 'Today', days: 'Half day', x: 0.9, z: 0.2, place: 'Market square, shop 9', bring: 'Tester, drill.' },
  { id: 'j12', trade: 'loading', kind: 'week', title: 'Warehouse packing, festival rush', employer: 'QuickKart hub', verified: true, hires: 120, pay: 750, unit: 'shift', hours: '7 am – 3 pm', start: 'Monday', days: '7 days', x: 5.0, z: -2.8, place: 'Hub 2, highway service road', bring: 'Phone with UPI for daily pay.' },
  { id: 'j13', trade: 'plumber', kind: 'week', title: 'Bathroom fittings, six flats', employer: 'Sai Constructions', verified: true, hires: 40, pay: 1050, unit: 'day', hours: '9 am – 6 pm', start: 'Thursday', days: '6 days', x: -2.0, z: 4.3, place: 'Riverside towers, site office', bring: 'Your own tools.' },
  { id: 'j14', trade: 'housekeeping', kind: 'day', title: 'Post-construction clean-up', employer: 'Homecraft Studio', verified: true, hires: 17, pay: 700, unit: 'day', hours: '9 am – 5 pm', start: 'Saturday', days: '2 days', x: -1.6, z: -0.9, place: 'Gulmohar Society, A wing', bring: 'Nothing. Supplies provided.' },
  { id: 'j15', trade: 'carpenter', kind: 'day', title: 'Shop shutter frame repair', employer: 'Iqbal Hardware', verified: false, hires: 2, pay: 1100, unit: 'job', hours: 'Morning', start: 'Tomorrow', days: 'Half day', x: 2.9, z: 2.1, place: 'Market road, shop 31', bring: 'Welding not needed. Hand tools.' },
  { id: 'j16', trade: 'helper', kind: 'week', title: 'Shifting a household', employer: 'Swift Movers', verified: true, hires: 29, pay: 800, unit: 'day', hours: '8 am – 6 pm', start: 'Friday', days: '2 days', x: -5.0, z: -0.6, place: 'Pick-up at Gulmohar Society', bring: 'Gloves. Lunch provided.' },
]

export const money = (n) => `₹${n.toLocaleString('en-IN')}`
export const payLine = (j) => `${money(j.pay)} / ${j.unit}`
