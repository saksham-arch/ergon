// What goes on Themis' scales. Offers are weighed term by term; schemes are
// matched from a few plain questions. Reference rates are mock figures;
// scheme rules are summarised from public scheme pages and should be checked
// at a CSC or the scheme's own portal before relying on them.

export const LOCAL_RATE = {
  mason: 900,
  painter: 850,
  electrician: 1000,
  plumber: 950,
  carpenter: 1000,
  helper: 650,
  housekeeping: 600,
  loading: 700,
}

// Each token: side 'fair' (left pan) or 'risk' (right pan), a weight, a line.
export function weighOffer(o) {
  const t = []
  const ref = LOCAL_RATE[o.trade] ?? 800
  if (o.pay >= ref * 0.9 && o.pay <= ref * 1.8) t.push({ id: 'pay', side: 'fair', w: 2, label: `Pay is fair for the area (about ₹${ref.toLocaleString('en-IN')} a day)` })
  else if (o.pay < ref * 0.75) t.push({ id: 'pay', side: 'risk', w: 2, label: `Pay is well below the local rate of about ₹${ref.toLocaleString('en-IN')}` })
  else if (o.pay > ref * 2) t.push({ id: 'pay', side: 'risk', w: 2, label: 'Pay is far above the local rate, a common bait in fake listings' })
  else t.push({ id: 'pay', side: 'fair', w: 1, label: 'Pay is a little under the local rate; you can ask for more' })

  if (o.hours <= 9) t.push({ id: 'hours', side: 'fair', w: 1, label: `${o.hours} hours a day` })
  else t.push({ id: 'hours', side: 'risk', w: 1, label: `${o.hours} hours a day: time beyond 9 hours is overtime, paid at twice the rate` })

  if (o.payday === 'daily' || o.payday === 'weekly') t.push({ id: 'payday', side: 'fair', w: 1, label: `Paid ${o.payday}` })
  else t.push({ id: 'payday', side: 'risk', w: 1, label: 'Paid only when the job ends: ask for weekly part-payment' })

  if (o.address) t.push({ id: 'address', side: 'fair', w: 1, label: 'Site address given' })
  else t.push({ id: 'address', side: 'risk', w: 2, label: 'No site address, only a phone number' })

  if (o.fee > 0) t.push({ id: 'fee', side: 'risk', w: 4, label: `Asks for ₹${o.fee.toLocaleString('en-IN')} upfront. Genuine employers never charge you to work.` })

  if (o.written) t.push({ id: 'written', side: 'fair', w: 1, label: 'Terms in writing, on Ergon' })
  else t.push({ id: 'written', side: 'risk', w: 1, label: 'Nothing in writing yet' })

  if (o.verified) t.push({ id: 'verified', side: 'fair', w: 1, label: 'Employer verified, with past hires' })
  else t.push({ id: 'verified', side: 'risk', w: 1, label: 'Employer not verified yet' })

  const fair = t.filter((x) => x.side === 'fair').reduce((a, x) => a + x.w, 0)
  const risk = t.filter((x) => x.side === 'risk').reduce((a, x) => a + x.w, 0)
  let verdict
  if (o.fee > 0 || risk >= 6) verdict = { word: 'Walk away', tone: 'bad', line: 'Too much on the wrong side. Do not pay anything, and report the listing.' }
  else if (risk >= 2) verdict = { word: 'Ask first', tone: 'mid', line: 'Mostly fair, with terms to settle before you go. Ask for them in writing.' }
  else verdict = { word: 'Fair offer', tone: 'good', line: 'The terms are clear and fair. Your record will show this job once it’s done.' }
  return { tokens: t, fair, risk, verdict }
}

export const PRESETS = {
  fair: { trade: 'plumber', pay: 1000, hours: 8, payday: 'daily', address: true, fee: 0, written: true, verified: true },
  doubt: { trade: 'mason', pay: 700, hours: 11, payday: 'end', address: true, fee: 0, written: false, verified: false },
  scam: { trade: 'helper', pay: 2600, hours: 8, payday: 'end', address: false, fee: 5000, written: false, verified: false },
}

export const SCHEMES = [
  {
    id: 'eshram',
    name: 'e-Shram card',
    what: 'A national ID for unorganised workers, and the door to most other schemes.',
    need: ['Aadhaar', 'Phone linked to Aadhaar', 'Bank account'],
    where: 'eshram.gov.in, or any Common Service Centre (CSC)',
    ok: (a) => a.age >= 16 && a.age <= 59 && !a.epf,
  },
  {
    id: 'bocw',
    name: 'Construction workers’ welfare board',
    what: 'Your state board helps with tools, children’s education, maternity and accident cover.',
    need: ['Aadhaar', 'Proof of 90 days of building work in the last year', 'Bank account'],
    where: 'Your state BOCW board office or a CSC',
    ok: (a) => a.work === 'construction' && a.age >= 18 && a.age <= 60,
  },
  {
    id: 'pmsym',
    name: 'PM Shram Yogi Maan-dhan',
    what: 'A pension of ₹3,000 a month after 60, for a small monthly contribution that the government matches.',
    need: ['Aadhaar', 'Savings or Jan Dhan account'],
    where: 'Any CSC',
    ok: (a) => a.age >= 18 && a.age <= 40 && a.income === 'low' && !a.epf,
  },
  {
    id: 'svanidhi',
    name: 'PM SVANidhi',
    what: 'Working-capital loans for street vendors, growing with each one you repay on time.',
    need: ['Vending certificate, or a letter of recommendation from your town body', 'Aadhaar', 'Bank account'],
    where: 'pmsvanidhi.mohua.gov.in, or a CSC',
    ok: (a) => a.work === 'vending',
  },
  {
    id: 'pmsby',
    name: 'PM Suraksha Bima',
    what: 'Accident insurance of ₹2 lakh for ₹20 a year, taken from your bank account.',
    need: ['Bank account', 'Aadhaar'],
    where: 'Your bank branch',
    ok: (a) => a.age >= 18 && a.age <= 70,
  },
  {
    id: 'pmjjby',
    name: 'PM Jeevan Jyoti Bima',
    what: 'Life cover of ₹2 lakh for ₹436 a year.',
    need: ['Bank account', 'Aadhaar'],
    where: 'Your bank branch',
    ok: (a) => a.age >= 18 && a.age <= 50,
  },
  {
    id: 'pmjay',
    name: 'Ayushman Bharat (PM-JAY)',
    what: 'Cashless hospital care up to ₹5 lakh a year per family, at listed hospitals, if your family is eligible.',
    need: ['Ration card or Aadhaar to check eligibility'],
    where: 'Any CSC or listed hospital’s Ayushman desk',
    ok: (a) => a.income === 'low',
  },
]

export function matchSchemes(a) {
  const yes = SCHEMES.filter((s) => s.ok(a))
  const todo = []
  if (!a.aadhaar) todo.push({ id: 'aadhaar', label: 'Get an Aadhaar first: almost every scheme needs it' })
  if (!a.bank) todo.push({ id: 'bank', label: 'Open a zero-balance Jan Dhan bank account' })
  return { yes, todo }
}
