// The formal opening of each act: numeral, the god who keeps it, an engraved
// emblem, and the promise in one line.
export default function GodHeader({ n, god, role, emblem, title, sub, id }) {
  return (
    <header className="god" id={id}>
      <div className="god-mark">
        <img className="god-emblem" src={emblem} alt="" aria-hidden="true" />
      </div>
      <div className="god-text">
        <p className="god-n">
          <span>{n}</span>
          {god} · {role}
        </p>
        <h2 className="god-title">{title}</h2>
        <p className="god-sub">{sub}</p>
      </div>
    </header>
  )
}
