import { useState, useEffect, useRef } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function pickWeighted(members, history, fair) {
  if (!fair || members.length <= 1)
    return members[Math.floor(Math.random() * members.length)]
  const counts = members.map(m => history[m.id] ?? 0)
  const max = Math.max(...counts)
  const weights = counts.map(c => Math.pow(2, max - c) + 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < members.length; i++) { r -= weights[i]; if (r <= 0) return members[i] }
  return members[members.length - 1]
}

function buzz(ms) { try { navigator?.vibrate?.(ms) } catch { } }

function useReducedMotion() {
  const [v, setV] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = e => setV(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return v
}

function nowString() {
  return new Date().toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ─── data ────────────────────────────────────────────────────────────────────

let _id = 1
const uid = () => _id++
const newMember = () => ({ id: uid(), name: '' })

const AVATAR_BG = [
  '#e74c3c', '#e67e22', '#2ecc71', '#3498db',
  '#9b59b6', '#1abc9c', '#e91e63', '#ff5722',
  '#607d8b', '#795548',
]

// ─── confetti ─────────────────────────────────────────────────────────────────

const PIECES = Array.from({ length: 72 }, (_, i) => ({
  x: Math.random() * 100,
  delay: Math.random() * 0.5,
  dur: 2.2 + Math.random() * 1.4,
  size: 8 + Math.random() * 10,
  rot: Math.random() * 360,
  color: ['#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'][i % 6],
  circle: i % 3 === 0,
}))

function Confetti({ on }) {
  if (!on) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 200 }} aria-hidden="true">
      {PIECES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -20, left: `${p.x}%`,
          width: p.size, height: p.circle ? p.size : p.size * 0.5,
          background: p.color, borderRadius: p.circle ? '50%' : 2,
          animation: `cf ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────

function Toast({ msg }) {
  if (!msg) return null
  return (
    <div role="status" style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: '#111', color: '#fff', padding: '12px 22px', borderRadius: 12,
      fontSize: 14, fontWeight: 600, zIndex: 300,
      maxWidth: '88vw', textAlign: 'center',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      animation: 'toast-in 0.25s ease', whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

// ─── avatar chip ─────────────────────────────────────────────────────────────

function AvatarChip({ member, index, editing, onEdit, onNameChange, onDone, onRemove, canRemove, timesChosen }) {
  const inputRef = useRef(null)
  const display = member.name.trim() || `Person ${index + 1}`
  const initial = member.name.trim() ? member.name.trim()[0].toUpperCase() : String(index + 1)
  const bg = AVATAR_BG[index % AVATAR_BG.length]

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        onClick={() => { onEdit(); buzz(6) }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          border: editing ? '3px solid #DC2626' : '3px solid transparent',
          background: bg, color: '#fff', fontSize: 24, fontWeight: 900,
          cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
          boxShadow: '0 3px 12px rgba(0,0,0,0.22)',
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 0.12s',
        }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        aria-label={`Edit name for ${display}`}
      >
        {initial}
        {timesChosen > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#DC2626', color: '#fff', borderRadius: '50%',
            width: 20, height: 20, fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #1a0800',
          }}>{timesChosen}</span>
        )}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={member.name}
          onChange={e => onNameChange(e.target.value)}
          onBlur={onDone}
          onKeyDown={e => e.key === 'Enter' && onDone()}
          placeholder={`Person ${index + 1}`}
          maxLength={12}
          style={{
            width: 72, textAlign: 'center', fontSize: 13, fontFamily: 'inherit',
            border: '2px solid #DC2626', borderRadius: 8,
            padding: '4px 2px', outline: 'none', color: '#111',
            background: '#fff',
          }}
          aria-label={`Name for person ${index + 1}`}
        />
      ) : (
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', textAlign: 'center',
        }}>
          {display}
        </span>
      )}

      {canRemove && !editing && (
        <button
          onClick={() => { onRemove(); buzz(8) }}
          style={{
            fontSize: 11, color: 'rgba(255,255,255,0.35)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 4px', fontFamily: 'inherit',
          }}
          aria-label={`Remove ${display}`}
        >
          remove
        </button>
      )}
    </div>
  )
}

// ─── result overlay ───────────────────────────────────────────────────────────

function ResultOverlay({ phase, spinName, result, members, onAgain, onReset, onClose, reducedMotion, toast, showToast }) {
  if (!phase) return null

  const displayName = m => {
    const i = members.findIndex(x => x.id === m.id)
    return (m.name.trim() || `Person ${i + 1}`).toUpperCase()
  }

  const shareResult = async () => {
    if (!result) return
    const winner = displayName(result.winner)
    const text = `🧾 WHO PAYS?\n${'─'.repeat(22)}\n👉 ${winner} PAYS THE WHOLE BILL! 🎯\n\nDecided at ${result.timestamp}\n— The Bill Decider`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Who Pays the Bill?', text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        showToast('Copied! Paste in the group chat 📋')
      }
    } catch { }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.93)' }} />

      {/* spinning */}
      {phase === 'spinning' && (
        <div style={{
          position: 'relative', zIndex: 1, width: '100%', flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            🎲  Picking someone…
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 62, fontWeight: 900, color: '#fff',
              letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1,
              textAlign: 'center', padding: '0 24px',
              animation: 'spin-name 0.32s ease-in-out infinite alternate',
              textShadow: '0 0 40px rgba(220,38,38,0.6)',
            }}
          >
            {spinName}
          </div>
        </div>
      )}

      {/* result bottom sheet */}
      {phase === 'result' && result && (
        <>
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 60, animation: reducedMotion ? 'none' : 'pop-in 0.5s cubic-bezier(.2,1.4,.4,1)' }}>🎉</div>
          </div>

          <div style={{
            position: 'relative', zIndex: 1, width: '100%',
            background: '#FFFBF5', borderRadius: '28px 28px 0 0',
            maxHeight: '78vh', overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            animation: reducedMotion ? 'none' : 'slide-up 0.42s cubic-bezier(.2,1,.4,1)',
          }}>
            {/* drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
            </div>

            <div style={{ padding: '12px 24px 44px', fontFamily: "'Courier New', Courier, monospace" }}>

              {/* receipt header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.15em', color: '#111', margin: '6px 0 2px' }}>THE VERDICT</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{result.timestamp}</div>
              </div>

              {/* stamp */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 24px' }}>
                <div style={{
                  display: 'inline-block',
                  border: '3px solid #DC2626', borderRadius: 4,
                  padding: '12px 28px', transform: 'rotate(-5deg)',
                  boxShadow: '0 0 0 1px #DC2626 inset, 3px 6px 20px rgba(220,38,38,0.35)',
                  userSelect: 'none',
                  animation: reducedMotion ? 'none' : 'stamp-in 0.45s cubic-bezier(.2,1.4,.4,1)',
                }}>
                  <div style={{ color: '#DC2626', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.08em' }}>
                    <div style={{ fontSize: 28 }}>{displayName(result.winner)}</div>
                    <div style={{ fontSize: 12, borderTop: '2px solid #DC2626', marginTop: 5, paddingTop: 5 }}>
                      PAYS THE BILL!
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
                Better luck next time, everyone else 😅
              </div>

              {/* trip tally */}
              {members.some(m => (result.history[m.id] ?? 0) > 0) && (
                <>
                  <div style={{ borderTop: '1px dashed #D1D5DB', paddingTop: 16, marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                      Trip Tally
                    </div>
                    {members.map((m, i) => {
                      const count = result.history[m.id] ?? 0
                      if (!count) return null
                      const max = Math.max(...members.map(x => result.history[x.id] ?? 0), 1)
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                          <span style={{ fontSize: 12, color: '#374151', width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            {displayName(m)}
                          </span>
                          <div style={{ flex: 1, background: '#E5E7EB', borderRadius: 999, height: 7, overflow: 'hidden' }}>
                            <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: '#DC2626', borderRadius: 999, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: 12, color: '#6B7280', width: 18, textAlign: 'right' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', letterSpacing: '0.15em', margin: '16px 0 20px' }}>
                ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦
              </div>

              {/* actions */}
              <button
                onClick={shareResult}
                style={{
                  width: '100%', padding: '17px', border: 'none', borderRadius: 16,
                  background: '#DC2626', color: '#fff', fontSize: 16, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                📲 Share with the Group
              </button>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={onAgain}
                  style={{
                    flex: 1, padding: '14px', border: '1.5px solid #E5E7EB', borderRadius: 14,
                    background: '#fff', color: '#374151', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ↺ Roll Again
                </button>
                <button
                  onClick={onReset}
                  style={{
                    flex: 1, padding: '14px', border: '1.5px solid #E5E7EB', borderRadius: 14,
                    background: '#fff', color: '#374151', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ✕ Reset Tally
                </button>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '14px', border: '1.5px solid #E5E7EB', borderRadius: 14,
                  background: '#fff', color: '#9CA3AF', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function App() {
  const [members, setMembers] = useState(() => [newMember(), newMember(), newMember()])
  const [fairMode, setFairMode] = useState(false)
  const [history, setHistory] = useState({})

  const [overlayPhase, setOverlayPhase] = useState(null)   // null | spinning | result
  const [spinName, setSpinName] = useState('')
  const [result, setResult] = useState(null)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState('')
  const [editingId, setEditingId] = useState(null)

  const reducedMotion = useReducedMotion()
  const spinTimer = useRef(null)
  const confettiTimer = useRef(null)
  const toastTimer = useRef(null)

  const displayOf = m => {
    const i = members.findIndex(x => x.id === m.id)
    return m.name.trim() || `Person ${i + 1}`
  }

  const showToast = msg => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  const setSize = n => {
    n = Math.max(2, Math.min(10, n))
    setMembers(ms =>
      n > ms.length
        ? [...ms, ...Array.from({ length: n - ms.length }, newMember)]
        : ms.slice(0, n)
    )
    buzz(8)
  }

  const finalise = winner => {
    const newHistory = { ...history, [winner.id]: (history[winner.id] ?? 0) + 1 }
    setHistory(newHistory)
    setResult({ winner, timestamp: nowString(), history: newHistory })
    setOverlayPhase('result')
    buzz([0, 60, 40, 120])
    if (!reducedMotion) {
      setConfetti(true)
      clearTimeout(confettiTimer.current)
      confettiTimer.current = setTimeout(() => setConfetti(false), 3600)
    }
  }

  const doStamp = () => {
    setEditingId(null)
    buzz(20)
    const winner = pickWeighted(members, history, fairMode)

    if (reducedMotion) {
      setOverlayPhase('spinning')
      setTimeout(() => finalise(winner), 60)
      return
    }

    setOverlayPhase('spinning')
    let elapsed = 0
    const duration = 2600
    let interval = 65

    const spin = () => {
      const idx = Math.floor(Math.random() * members.length)
      setSpinName(displayOf(members[idx]).toUpperCase())
      buzz(4)
      elapsed += interval
      interval = 65 + (elapsed / duration) ** 2 * 560
      if (elapsed >= duration) {
        setSpinName(displayOf(winner).toUpperCase())
        setTimeout(() => finalise(winner), 380)
        return
      }
      spinTimer.current = setTimeout(spin, interval)
    }
    spinTimer.current = setTimeout(spin, interval)
  }

  const handleAgain = () => {
    setOverlayPhase(null); setResult(null); setSpinName(''); setConfetti(false)
  }
  const handleReset = () => {
    setOverlayPhase(null); setResult(null); setSpinName(''); setConfetti(false)
    setHistory({}); showToast('Tally cleared 🧼')
  }
  const handleClose = () => {
    setOverlayPhase(null); setResult(null); setSpinName(''); setConfetti(false)
  }

  useEffect(() => () => {
    clearTimeout(spinTimer.current)
    clearTimeout(confettiTimer.current)
    clearTimeout(toastTimer.current)
  }, [])

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg, #1a0800 0%, #2d0f00 50%, #1a0800 100%)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      padding: '32px 16px 60px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* header */}
        <div style={{ color: '#fff', marginBottom: 28 }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>🍽️</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px' }}>
            Who pays?
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>
            Add your group, tap the button, fate decides.
          </p>
        </div>

        {/* people card */}
        <div style={{
          background: '#fff', borderRadius: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', padding: '22px 20px', marginBottom: 14,
        }}>
          {/* size stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>People at the table</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setSize(members.length - 1)}
                disabled={members.length <= 2}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: members.length > 2 ? '#111' : '#F3F4F6',
                  color: members.length > 2 ? '#fff' : '#D1D5DB',
                  fontSize: 22, fontWeight: 900, cursor: members.length > 2 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent', lineHeight: 1,
                }}
                aria-label="Fewer people"
              >−</button>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#111', minWidth: 28, textAlign: 'center' }}>
                {members.length}
              </span>
              <button
                onClick={() => setSize(members.length + 1)}
                disabled={members.length >= 10}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: members.length < 10 ? '#111' : '#F3F4F6',
                  color: members.length < 10 ? '#fff' : '#D1D5DB',
                  fontSize: 22, fontWeight: 900, cursor: members.length < 10 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent', lineHeight: 1,
                }}
                aria-label="More people"
              >+</button>
            </div>
          </div>

          {/* avatar grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: 14, marginBottom: 6,
          }}>
            {members.map((m, i) => (
              <AvatarChip
                key={m.id}
                member={m}
                index={i}
                editing={editingId === m.id}
                onEdit={() => setEditingId(m.id)}
                onNameChange={name => setMembers(ms => ms.map(x => x.id === m.id ? { ...x, name } : x))}
                onDone={() => setEditingId(null)}
                onRemove={() => setMembers(ms => ms.filter(x => x.id !== m.id))}
                canRemove={members.length > 2}
                timesChosen={history[m.id] ?? 0}
              />
            ))}
          </div>

          <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
            Tap an avatar to set a name
          </div>
        </div>

        {/* fair mode card */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: fairMode ? '#FEF2F2' : '#fff', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', padding: '16px 20px',
          cursor: 'pointer', marginBottom: 20,
          border: fairMode ? '2px solid #DC2626' : '2px solid transparent',
          transition: 'all 0.2s',
        }}>
          {/* iOS toggle */}
          <div style={{
            width: 50, height: 30, borderRadius: 15, flexShrink: 0, position: 'relative',
            background: fairMode ? '#DC2626' : '#D1D5DB', transition: 'background 0.22s',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: fairMode ? 23 : 3,
              width: 24, height: 24, borderRadius: '50%',
              background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
              transition: 'left 0.22s',
            }} />
            <input
              type="checkbox" checked={fairMode}
              onChange={e => { setFairMode(e.target.checked); buzz(8) }}
              style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', margin: 0 }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Fair Mode</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 1.4 }}>
              Lowers the odds for whoever has paid most recently
            </div>
          </div>
        </label>

        {/* stamp button */}
        <button
          onClick={doStamp}
          style={{
            width: '100%', padding: '22px 24px', border: 'none', borderRadius: 20,
            background: '#DC2626', color: '#fff', fontSize: 22, fontWeight: 900,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em',
            boxShadow: '0 8px 30px rgba(220,38,38,0.45)',
            animation: 'ready-pulse 2.2s ease-in-out infinite',
            WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={e => {
            e.currentTarget.style.transform = 'scale(0.96)'
            e.currentTarget.style.animation = 'none'
          }}
          onTouchEnd={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.animation = 'ready-pulse 2.2s ease-in-out infinite'
          }}
          aria-label="Stamp to decide who pays"
        >
          🔖  STAMP IT!
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
          No disputes accepted after stamping.
        </p>
      </div>

      <ResultOverlay
        phase={overlayPhase}
        spinName={spinName}
        result={result}
        members={members}
        onAgain={handleAgain}
        onReset={handleReset}
        onClose={handleClose}
        reducedMotion={reducedMotion}
        toast={toast}
        showToast={showToast}
      />

      <Confetti on={confetti} />
      <Toast msg={toast} />

      <style>{`
        @keyframes cf {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spin-name {
          from { opacity: 0.5; transform: scale(0.92); }
          to   { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes stamp-in {
          0%   { opacity: 0; transform: rotate(-5deg) scale(2); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: rotate(-5deg) scale(1); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes pop-in {
          0%   { transform: scale(0);   opacity: 0; }
          60%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes ready-pulse {
          0%, 100% { box-shadow: 0 8px 30px rgba(220,38,38,0.45); }
          50%       { box-shadow: 0 8px 44px rgba(220,38,38,0.75); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
        button:focus-visible, input:focus-visible { outline: 3px solid #F59E0B; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  )
}
