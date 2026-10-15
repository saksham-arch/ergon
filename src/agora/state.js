// A small bridge so the rest of the world can send the reader into the agora
// with a trade already chosen (a figure on the vase, chapter Α's button).
export const agora = {
  trade: 'all',
  setTrade: null,
  show(trade = 'all') {
    agora.trade = trade
    agora.setTrade?.(trade)
    document.getElementById('agora')?.scrollIntoView({ behavior: 'smooth' })
  },
}
