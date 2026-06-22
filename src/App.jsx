import { useState, useEffect, useRef, useCallback } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function splitEvenly(total, count) {
  const base = Math.floor((total * 100) / count)
  const remainder = Math.round(total * 100) - base * count
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100)
}

function pickWeighted(members, history, fairMode) {
  if (!fairMode || members.length <= 1) {
    return members[Math.floor(Math.random() * members.length)]
  }
  const counts = members.map(m => history[m.id] ?? 0)
  const maxCount = Math.max(...counts)
  const weights = counts.map(c => Math.pow(2, maxCount - c) + 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < members.length; i++) {
    r -= weights[i]
    if (r <= 0) return members[i]
  }
  return members[members.length - 1]
}

function buzz(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch { /* ignore */ }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = e => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function nowString() {
  return new Date().toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ─── confetti ─────────────────────────────────────────────────────────────────

function Confetti({ show }) {
  if (!show) return null
  const colors = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899']
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 60 }} aria-hidden="true">
      {Array.from({ length: 60 }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.4
        const dur = 1.8 + Math.random() * 1.4
        const size = 7 + Math.random() * 9
        return (
          <div
            key={i}
            style={{
              position: 'absolute', top: -24, left: `${left}%`,
              width: size, height: size * 0.55,
              background: colors[i % colors.length],
              borderRadius: 2,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `confetti-fall ${dur}s ${delay}s cubic-bezier(.3,.6,.5,1) forwards`,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────

function Toast({ message }) {
  if (!message) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#1c1917', color: '#faf9f7', padding: '12px 20px',
        borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 70,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxWidth: '90vw', textAlign: 'center',
        animation: 'toast-in 0.25s ease',
      }}
    >
      {message}
    </div>
  )
}

// ─── receipt chrome ───────────────────────────────────────────────────────────

function Perforation() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', height: 20 }}>
      {Array.from({ length: 44 }).map((_, i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: '#92400e', margin: -2 }} />
      ))}
    </div>
  )
}

function Divider({ solid = false }) {
  return <div style={{ borderTop: `1px ${solid ? 'solid' : 'dashed'} #a8a29e`, margin: '14px 0' }} />
}

// ─── member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, index, onNameChange, onRemove, canRemove, pickCount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={{ color: '#78716c', fontSize: 13, width: 20, textAlign: 'right', flexShrink: 0 }}>
        {index + 1}.
      </span>
      <input
        type="text"
        value={member.name}
        onChange={e => onNameChange(member.id, e.target.value)}
        placeholder={`Person ${index + 1}`}
        maxLength={20}
        style={{
          flex: 1, background: 'transparent',
          borderBottom: '1px dashed #a8a29e',
          color: '#1c1917', fontSize: 16,
          padding: '6px 4px', fontFamily: 'inherit',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          outline: 'none', minWidth: 0,
        }}
        onFocus={e => { e.target.style.borderBottomColor = '#1c1917' }}
        onBlur={e => { e.target.style.borderBottomColor = '#a8a29e' }}
        aria-label={`Name for person ${index + 1}`}
      />
      {pickCount > 0 && (
        <span style={{ color: '#78716c', fontSize: 12, flexShrink: 0 }} title="Times picked this session">
          ×{pickCount}
        </span>
      )}
      {canRemove && (
        <button
          onClick={() => onRemove(member.id)}
          style={{
            color: '#a8a29e', fontSize: 16, width: 36, height: 36,
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, padding: 0,
          }}
          aria-label={`Remove ${member.name || `person ${index + 1}`}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ─── stamp ────────────────────────────────────────────────────────────────────

function Stamp({ winnerName, mode }) {
  const line2 =
    mode === 'one-pays' ? 'PAYS THE BILL!'
    : mode === 'loser-tip' ? 'PAYS THE TIP!'
    : 'EVERYONE SPLITS!'

  return (
    <div
      style={{
        display: 'inline-block',
        border: '3px solid #dc2626',
        borderRadius: 4,
        padding: '10px 22px',
        transform: 'rotate(-6deg)',
        boxShadow: '0 0 0 1px #dc2626 inset, 2px 4px 12px rgba(220,38,38,0.25)',
        userSelect: 'none',
        animation: 'stamp-in 0.4s cubic-bezier(.2,1.4,.4,1)',
      }}
    >
      <div style={{ color: '#dc2626', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.08em' }}>
        <div style={{ fontSize: 28 }}>{winnerName}</div>
        <div style={{ fontSize: 12, borderTop: '2px solid #dc2626', marginTop: 5, paddingTop: 5 }}>{line2}</div>
      </div>
    </div>
  )
}

// ─── split table ──────────────────────────────────────────────────────────────

function SplitTable({ members, shares, tipPayerIdx, tipAmount, displayName }) {
  return (
    <div style={{ marginTop: 8 }}>
      {members.map((m, i) => (
        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0' }}>
          <span style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#44403c' }}>
            {displayName(m)}
            {tipPayerIdx === i && <span style={{ marginLeft: 6, color: '#dc2626', fontSize: 12 }}>(+TIP)</span>}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: tipPayerIdx === i ? '#dc2626' : '#1c1917',
          }}>
            {fmt(shares[i] + (tipPayerIdx === i ? tipAmount : 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── tally bars ───────────────────────────────────────────────────────────────

function TallyBars({ members, history, displayName }) {
  const max = Math.max(...members.map(m => history[m.id] ?? 0), 1)
  const hasTally = members.some(m => (history[m.id] ?? 0) > 0)
  if (!hasTally) return null

  return (
    <>
      <Divider />
      <div style={{ fontSize: 11, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        Who's Paid So Far
      </div>
      {members.map(m => {
        const count = history[m.id] ?? 0
        if (count === 0) return null
        const pct = (count / max) * 100
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#78716c', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName(m)}
            </span>
            <div style={{ flex: 1, background: '#e7e5e4', borderRadius: 999, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#dc2626', borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: '#78716c', width: 16, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {count}
            </span>
          </div>
        )
      })}
    </>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

let nextId = 1
function makeId() { return nextId++ }
function makeMember() { return { id: makeId(), name: '' } }

const MODES = [
  { key: 'one-pays',  label: '🎯 One Pays',   desc: 'One lucky loser covers the whole bill.' },
  { key: 'split',     label: '✂️ Split',       desc: 'Divide the bill equally between everyone.' },
  { key: 'loser-tip', label: '💸 Loser Tips',  desc: 'Split the bill, but one person pays the tip.' },
]

const TIP_PRESETS = [10, 15, 18, 20, 25]

export default function App() {
  const [members, setMembers] = useState(() => [makeMember(), makeMember(), makeMember()])
  const [mode, setMode] = useState('one-pays')
  const [billAmount, setBillAmount] = useState('')
  const [tipValue, setTipValue] = useState('')
  const [tipType, setTipType] = useState('pct')
  const [fairMode, setFairMode] = useState(false)
  const [history, setHistory] = useState({})

  const [phase, setPhase] = useState('idle')  // idle | spinning | done
  const [spinName, setSpinName] = useState('')
  const [result, setResult] = useState(null)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState('')

  const reducedMotion = useReducedMotion()
  const spinTimer = useRef(null)
  const confettiTimer = useRef(null)
  const toastTimer = useRef(null)
  const resultRef = useRef(null)

  const displayName = useCallback(
    m => (m.name.trim() ? m.name.trim().toUpperCase() : `PERSON ${members.indexOf(m) + 1}`),
    [members]
  )

  const showToast = msg => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  // members
  const addMember = () => { if (members.length < 10) { setMembers(ms => [...ms, makeMember()]); buzz(8) } }
  const removeMember = id => { if (members.length > 2) { setMembers(ms => ms.filter(m => m.id !== id)); buzz(8) } }
  const updateName = (id, name) => setMembers(ms => ms.map(m => m.id === id ? { ...m, name } : m))

  const setPartySize = n => {
    n = Math.max(2, Math.min(10, n))
    setMembers(ms => {
      if (n === ms.length) return ms
      if (n > ms.length) return [...ms, ...Array.from({ length: n - ms.length }, makeMember)]
      return ms.slice(0, n)
    })
    buzz(8)
  }

  // tip
  const computeTip = useCallback(() => {
    const bill = parseFloat(billAmount) || 0
    const val = parseFloat(tipValue) || 0
    return tipType === 'pct' ? (bill * val) / 100 : val
  }, [billAmount, tipValue, tipType])

  const finalise = useCallback((winner) => {
    const bill = parseFloat(billAmount) || 0
    const n = members.length
    let shares = Array(n).fill(0)
    let tipPayerIdx = null
    let tipAmount = 0

    if (mode === 'split' || mode === 'loser-tip') shares = splitEvenly(bill, n)
    if (mode === 'loser-tip') {
      tipAmount = computeTip()
      tipPayerIdx = members.findIndex(m => m.id === winner.id)
    }

    setHistory(h => ({ ...h, [winner.id]: (h[winner.id] ?? 0) + 1 }))
    setResult({ winner, shares, tipPayerIdx, tipAmount, timestamp: nowString(), mode })
    setPhase('done')
    buzz([0, 60, 40, 120])

    if (!reducedMotion) {
      setConfetti(true)
      clearTimeout(confettiTimer.current)
      confettiTimer.current = setTimeout(() => setConfetti(false), 3200)
    }
    // bring result into view on small screens
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }), 100)
  }, [billAmount, members, mode, computeTip, reducedMotion])

  const stamp = () => {
    if (phase === 'spinning') return
    buzz(15)
    const winner = pickWeighted(members, history, fairMode)

    if (reducedMotion) { finalise(winner); return }

    setPhase('spinning')
    setResult(null)
    setConfetti(false)

    let elapsed = 0
    const duration = 2400
    let interval = 70

    const spin = () => {
      const idx = Math.floor(Math.random() * members.length)
      setSpinName(displayName(members[idx]))
      buzz(5)
      elapsed += interval
      const progress = elapsed / duration
      interval = 70 + progress * progress * 500

      if (elapsed >= duration) {
        clearTimeout(spinTimer.current)
        setSpinName(displayName(winner))
        setTimeout(() => finalise(winner), 350)
        return
      }
      spinTimer.current = setTimeout(spin, interval)
    }
    spinTimer.current = setTimeout(spin, interval)
  }

  const again = () => { setPhase('idle'); setResult(null); setSpinName(''); setConfetti(false) }
  const reset = () => { again(); setHistory({}); showToast('Tally cleared 🧼') }

  const shareResult = async () => {
    if (!result) return
    const modeInfo = MODES.find(mm => mm.key === result.mode)
    const winner = displayName(result.winner)
    let text = `🧾 THE BILL DECIDER\n`
    if (result.mode === 'one-pays') text += `\n👉 ${winner} PAYS THE BILL! 🎯`
    else if (result.mode === 'loser-tip') text += `\n👉 ${winner} PAYS THE TIP! 💸\nEveryone splits the rest.`
    else text += `\n✂️ Split evenly — ${fmt((parseFloat(billAmount) || 0) / members.length)} each`
    if ((result.mode === 'split' || result.mode === 'loser-tip') && grandTotal > 0) {
      text += `\nTotal: ${fmt(grandTotal)}`
    }
    text += `\n\n(${modeInfo.desc})`

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Who Pays the Bill?', text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        showToast('Result copied — paste it in the group chat! 📋')
      } else {
        showToast('Sharing not supported on this device')
      }
    } catch { /* user cancelled — ignore */ }
  }

  useEffect(() => () => {
    clearTimeout(spinTimer.current)
    clearTimeout(confettiTimer.current)
    clearTimeout(toastTimer.current)
  }, [])

  const bill = parseFloat(billAmount) || 0
  const tipAmt = computeTip()
  const grandTotal = bill + (mode === 'loser-tip' ? tipAmt : 0)
  const needsBill = mode === 'split' || mode === 'loser-tip'

  const canStamp =
    phase !== 'spinning' &&
    members.length >= 2 &&
    (mode === 'one-pays' ||
     (mode === 'split' && bill > 0) ||
     (mode === 'loser-tip' && bill > 0 && parseFloat(tipValue) > 0))

  // friendly hint about what's missing
  const hint =
    phase === 'spinning' ? '' :
    mode === 'split' && bill <= 0 ? '⬆ Enter the bill amount to continue' :
    mode === 'loser-tip' && bill <= 0 ? '⬆ Enter the bill amount to continue' :
    mode === 'loser-tip' && bill > 0 && !(parseFloat(tipValue) > 0) ? '⬆ Set the tip to continue' :
    ''

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric',
  })

  const currentMode = MODES.find(m => m.key === mode)

  // ── styles ────────────────────────────────────────────────────────────────
  const paper = {
    background: '#faf9f7',
    fontFamily: "'Courier New', Courier, ui-monospace, monospace",
    color: '#1c1917',
    fontSize: 14,
    lineHeight: 1.5,
  }
  const labelStyle = {
    fontSize: 11, color: '#a8a29e',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
  }
  const inputStyle = {
    background: 'transparent',
    borderBottom: '1px dashed #a8a29e',
    color: '#1c1917',
    fontSize: 16,
    padding: '6px 4px',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    width: 110,
  }
  const stepBtn = (enabled) => ({
    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
    fontSize: 24, fontWeight: 900, fontFamily: 'inherit',
    border: '1.5px solid #1c1917',
    background: enabled ? '#1c1917' : '#e7e5e4',
    color: enabled ? '#faf9f7' : '#a8a29e',
    cursor: enabled ? 'pointer' : 'not-allowed',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, padding: 0, transition: 'all 0.12s',
  })
  const actionBtn = {
    flex: 1, padding: '12px 0', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', minHeight: 44,
    border: '1px solid #d6d3d1', borderRadius: 8, background: 'transparent',
    color: '#57534e', cursor: 'pointer',
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 55% 20%, #92400e 0%, #3c1a06 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 10px 40px',
    }}>

      <Confetti show={confetti} />
      <Toast message={toast} />

      {/* receipt */}
      <div style={{
        ...paper,
        width: '100%', maxWidth: 420,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)',
      }}>

        <div style={{ background: '#92400e', padding: '4px 0' }}><Perforation /></div>

        <div style={{ padding: '20px 22px 16px' }}>

          {/* ── header ──────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: '#a8a29e', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.18em', marginTop: 4 }}>THE BILL</div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.35em', color: '#78716c' }}>D E C I D E R</div>
            <div style={{ fontSize: 11, color: '#a8a29e', letterSpacing: '0.2em', marginTop: 4 }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
            <div style={{ fontSize: 12, color: '#78716c', marginTop: 8, letterSpacing: '0.04em' }}>
              TABLE FOR {members.length} &nbsp;·&nbsp; {dateStr}
            </div>
            <div style={{ fontSize: 12, color: '#57534e', marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
              Just ate out? Let fate decide who pays. 🍽️
            </div>
          </div>

          <Divider />

          {/* ── mode picker ─────────────────────────────────────────────── */}
          <div style={labelStyle}>1 · Pick a Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); again(); buzz(8) }}
                style={{
                  fontSize: 12, fontFamily: 'inherit', fontWeight: 700,
                  padding: '10px 4px', borderRadius: 8, cursor: 'pointer', minHeight: 48,
                  border: mode === m.key ? '1.5px solid #1c1917' : '1px solid #d6d3d1',
                  background: mode === m.key ? '#1c1917' : 'transparent',
                  color: mode === m.key ? '#faf9f7' : '#57534e',
                  lineHeight: 1.3, transition: 'all 0.12s',
                }}
                aria-pressed={mode === m.key}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#78716c', textAlign: 'center', minHeight: 18, marginBottom: 4 }}>
            {currentMode.desc}
          </div>

          <Divider />

          {/* ── party size stepper ──────────────────────────────────────── */}
          <div style={labelStyle}>2 · Who's at the Table?</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
            <button onClick={() => setPartySize(members.length - 1)} disabled={members.length <= 2}
              style={stepBtn(members.length > 2)} aria-label="Remove a person">−</button>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{members.length}</div>
              <div style={{ fontSize: 11, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>People</div>
            </div>
            <button onClick={() => setPartySize(members.length + 1)} disabled={members.length >= 10}
              style={stepBtn(members.length < 10)} aria-label="Add a person">+</button>
          </div>

          <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 4 }}>Tap a name to edit it:</div>
          <div>
            {members.map((m, i) => (
              <MemberRow
                key={m.id}
                member={m}
                index={i}
                onNameChange={updateName}
                onRemove={removeMember}
                canRemove={members.length > 2}
                pickCount={history[m.id] ?? 0}
              />
            ))}
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontSize: 13, color: '#57534e', userSelect: 'none', marginTop: 12,
            padding: '8px 10px', borderRadius: 8, background: '#f5f5f4',
          }}>
            <input
              type="checkbox"
              checked={fairMode}
              onChange={e => { setFairMode(e.target.checked); buzz(8) }}
              style={{ accentColor: '#dc2626', width: 18, height: 18, flexShrink: 0 }}
            />
            <span>
              <strong>Fair mode</strong> — go easy on people who already paid
            </span>
          </label>

          {/* ── bill inputs ─────────────────────────────────────────────── */}
          {needsBill && (
            <>
              <Divider />
              <div style={labelStyle}>3 · The Bill</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Bill total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: '#78716c', fontSize: 16 }}>$</span>
                  <input
                    type="number" inputMode="decimal" min="0" step="0.01"
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                    aria-label="Bill total in dollars"
                  />
                </div>
              </div>

              {mode === 'loser-tip' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Tip</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => { setTipType(t => t === 'pct' ? 'amt' : 'pct'); setTipValue('') }}
                        style={{
                          fontSize: 14, fontFamily: 'inherit', fontWeight: 700,
                          width: 40, height: 40, borderRadius: 8, cursor: 'pointer',
                          border: '1px solid #d6d3d1', background: 'transparent', color: '#57534e',
                        }}
                        aria-label="Switch between percentage and dollar tip"
                      >
                        {tipType === 'pct' ? '%' : '$'}
                      </button>
                      <input
                        type="number" inputMode="decimal" min="0"
                        step={tipType === 'pct' ? '1' : '0.01'}
                        value={tipValue}
                        onChange={e => setTipValue(e.target.value)}
                        placeholder={tipType === 'pct' ? '18' : '0.00'}
                        style={{ ...inputStyle, width: 90 }}
                        aria-label={`Tip ${tipType === 'pct' ? 'percentage' : 'dollar amount'}`}
                      />
                    </div>
                  </div>

                  {tipType === 'pct' && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {TIP_PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => { setTipValue(String(p)); buzz(8) }}
                          style={{
                            flex: 1, padding: '8px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                            borderRadius: 8, cursor: 'pointer', minHeight: 40,
                            border: String(p) === tipValue ? '1.5px solid #dc2626' : '1px solid #d6d3d1',
                            background: String(p) === tipValue ? '#fef2f2' : 'transparent',
                            color: String(p) === tipValue ? '#dc2626' : '#57534e',
                          }}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {bill > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78716c', marginBottom: 2 }}>
                  <span>EACH PERSON (BASE)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(bill / members.length)}</span>
                </div>
              )}
              {mode === 'loser-tip' && bill > 0 && tipAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#dc2626', marginBottom: 2 }}>
                  <span>TIP (1 UNLUCKY SOUL)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(tipAmt)}</span>
                </div>
              )}
            </>
          )}

          <Divider />

          {/* ── decide ──────────────────────────────────────────────────── */}
          <div style={{ ...labelStyle, textAlign: 'center' }}>{needsBill ? '4' : '3'} · Decide!</div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '4px 0 4px' }}>
            <div aria-live="polite" aria-atomic="true"
              style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {phase === 'spinning' && (
                <span style={{
                  fontSize: 24, fontWeight: 900, letterSpacing: '0.12em', color: '#1c1917',
                  animation: 'pulse 0.4s ease-in-out infinite alternate',
                }}>
                  {spinName}
                </span>
              )}
              {phase !== 'spinning' && hint && (
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{hint}</span>
              )}
            </div>

            <button
              onClick={stamp}
              disabled={!canStamp}
              style={{
                width: '100%', padding: '18px 0',
                fontSize: 19, fontFamily: 'inherit', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.18em', minHeight: 60,
                border: '2px solid', borderColor: canStamp ? '#1c1917' : '#d6d3d1', borderRadius: 12,
                background: canStamp ? '#1c1917' : '#f5f5f4',
                color: canStamp ? '#faf9f7' : '#a8a29e',
                cursor: canStamp ? 'pointer' : 'not-allowed',
                transition: 'transform 0.08s, background 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={e => { if (canStamp) e.currentTarget.style.transform = 'scale(0.97)' }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
              aria-label="Stamp to decide who pays"
            >
              {phase === 'spinning' ? '▒ DECIDING… ▒' : '🔖 STAMP IT!'}
            </button>
          </div>

          {/* ── result ───────────────────────────────────────────────────── */}
          {phase === 'done' && result && (
            <div ref={resultRef}>
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, margin: '8px 0' }}>

                <Stamp winnerName={displayName(result.winner)} mode={result.mode} />

                {(result.mode === 'split' || result.mode === 'loser-tip') && bill > 0 && (
                  <div style={{ width: '100%' }}>
                    <div style={{ ...labelStyle, textAlign: 'center', marginBottom: 6 }}>Breakdown</div>
                    <SplitTable
                      members={members}
                      shares={result.shares}
                      tipPayerIdx={result.tipPayerIdx}
                      tipAmount={result.tipAmount}
                      displayName={displayName}
                    />
                    <Divider solid />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                      <span>TOTAL</span>
                      <span style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal)}</span>
                    </div>
                  </div>
                )}

                {result.mode === 'one-pays' && (
                  <div style={{ fontSize: 12, color: '#a8a29e', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Better luck next time, everyone else!
                  </div>
                )}

                <div style={{ fontSize: 11, color: '#a8a29e', textAlign: 'center' }}>{result.timestamp}</div>

                {/* share — the social headline action */}
                <button
                  onClick={shareResult}
                  style={{
                    width: '100%', padding: '14px 0', fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.08em', minHeight: 50,
                    border: '2px solid #dc2626', borderRadius: 10, background: '#dc2626', color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  📲 Share Result
                </button>

                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button onClick={() => { again(); buzz(8) }} style={actionBtn}>↺ Again</button>
                  <button onClick={reset} style={actionBtn}>✕ Reset Tally</button>
                </div>
              </div>
            </div>
          )}

          {/* ── tally ─────────────────────────────────────────────────────── */}
          <TallyBars members={members} history={history} displayName={displayName} />

          {/* ── footer ───────────────────────────────────────────────────── */}
          <Divider />
          <div style={{ textAlign: 'center', fontSize: 11, color: '#a8a29e', letterSpacing: '0.06em', lineHeight: 1.9 }}>
            <div style={{ textTransform: 'uppercase' }}>Thank You For Dining With Us</div>
            <div>No disputes accepted after stamping.</div>
            <div style={{ marginTop: 4, letterSpacing: '0.15em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
          </div>
        </div>

        <div style={{ background: '#92400e', padding: '4px 0' }}><Perforation /></div>
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.6; transform: scale(0.96); }
          to   { opacity: 1;   transform: scale(1.04); }
        }
        @keyframes stamp-in {
          0%   { opacity: 0; transform: rotate(-6deg) scale(1.6); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: rotate(-6deg) scale(1); }
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0.9; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
        button:focus-visible, input:focus-visible {
          outline: 3px solid #f59e0b; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
