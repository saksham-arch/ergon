import assert from 'node:assert/strict'
import { CLIMB } from '../src/hill.js'
import { descent, stepDescent, SHARDS } from '../src/descent.js'
import { hall, chapterAt, T } from '../src/vase/hall.js'
import { PRESETS, weighOffer } from '../src/themis/rules.js'
const top = CLIMB + 1000
const start = CLIMB + 40
globalThis.window = { scrollY: start }
globalThis.document = { getElementById: () => ({ getBoundingClientRect: () => ({ top: top - window.scrollY }) }) }
const step = (t, released = true) => {
  window.scrollY = start + t * (top - start)
  return stepDescent({ released, at: { x: 700, y: 350, r: 168 }, vw: 1280, vh: 800 })
}
step(0)
assert.equal(descent.big.visible, true)
step(.6)
assert.equal(descent.big.visible, false)
assert.equal(descent.shards.length, SHARDS)
assert.ok(descent.shards.some(s => s.visible))
const snapshot = JSON.stringify(descent.shards)
step(.85)
step(.6)
assert.equal(JSON.stringify(descent.shards), snapshot, 'scroll reversal retraces every shard')
hall.active = true
hall.mouth = { x: 620, y: 280 }
step(.8)
assert.deepEqual(descent.mouth, hall.mouth, 'landing follows projected vase mouth')
step(1)
assert.ok(descent.shards.every(s => !s.visible), 'all shards enter the vase')
step(0, false)
assert.equal(descent.active, false)
assert.ok(descent.shards.every(s => !s.visible))
T.chapters.forEach(([a,b], i) => assert.equal(chapterAt((a+b)/2), i))
assert.equal(weighOffer(PRESETS.fair).verdict.tone, 'good')
assert.equal(weighOffer(PRESETS.scam).verdict.tone, 'bad')
assert.equal(weighOffer(PRESETS.doubt).verdict.tone, 'mid')
console.log('World checks passed: throw, split, reverse, mouth alignment, landing, chapters, offer presets.')
