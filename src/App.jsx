import { useState, useEffect, useRef, useCallback } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'INR', symbol: '₹', label: 'INR' },
]

function fmt(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

function roundUp(shares) {
  return shares.map(s => Math.ceil(s))
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

function getOdds(members, history, fairMode) {
  if (!fairMode || members.length <= 1) {
    const pct = Math.round(100 / members.length)
    return members.map(() => pct)
  }
  const counts = members.map(m => history[m.id] ?? 0)
  const maxCount = Math.max(...counts)
  const weights = counts.map(c => Math.pow(2, maxCount - c) + 1)
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map(w => Math.round((w / total) * 100))
}

function buzz(pattern) {
  try { if (navigator?.vibrate) navigator.vibrate(pattern) } catch { /* ignore */ }
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
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

function headerTimestamp() {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date}  ${time}`
}

// ─── confetti ─────────────────────────────────────────────────────────────────

function Confetti({ show }) {
  const pieces = useRef(
    Array.from({ length: 64 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.4,
      size: 7 + Math.random() * 9,
      rot: Math.random() * 360,
      color: ['#dc2626','#f59e0b','#10b981','#3b82f6','#a855f7','#ec4899'][i % 6],
    }))
  ).current
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 60 }} aria-hidden="true">
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -24, left: `${p.left}%`,
          width: p.size, height: p.size * 0.55,
          background: p.color, borderRadius: 2,
          transform: `rotate(${p.rot}deg)`,
          animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(.3,.6,.5,1) forwards`,
        }} />
      ))}
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────

function Toast({ message }) {
  if (!message) return null
  return (
    <div role="status" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1c1917', color: '#faf9f7', padding: '12px 22px',
      borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 70,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxWidth: '90vw', textAlign: 'center',
      animation: 'toast-in 0.25s ease', whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

// ─── receipt chrome ───────────────────────────────────────────────────────────

function Perforation() {
  return (
    <div style={{ display: 'flex', overflow: 'hidden', height: 20 }}>
      {Array.from({ length: 48 }).map((_, i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: '#92400e', margin: -2 }} />
      ))}
    </div>
  )
}

function Divider({ solid = false }) {
  return <div style={{ borderTop: `1px ${solid ? 'solid' : 'dashed'} #a8a29e`, margin: '14px 0' }} />
}

// ─── member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, index, onNameChange, onRemove, canRemove, pickCount, odds, fairMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
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
      {fairMode && odds != null && (
        <span style={{ color: '#a8a29e', fontSize: 11, flexShrink: 0, minWidth: 30, textAlign: 'right' }}
          title="Chance of being picked">
          {odds}%
        </span>
      )}
      {!fairMode && pickCount > 0 && (
        <span style={{ color: '#78716c', fontSize: 12, flexShrink: 0 }} title="Times picked">
          ×{pickCount}
        </span>
      )}
      {canRemove && (
        <button
          onClick={() => onRemove(member.id)}
          style={{
            color: '#a8a29e', fontSize: 16, width: 36, height: 36, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, padding: 0,
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
    : 'ALL SPLIT!'

  return (
    <div style={{
      display: 'inline-block', border: '3px solid #dc2626', borderRadius: 4,
      padding: '10px 24px', transform: 'rotate(-6deg)',
      boxShadow: '0 0 0 1px #dc2626 inset, 2px 4px 14px rgba(220,38,38,0.3)',
      userSelect: 'none', animation: 'stamp-in 0.4s cubic-bezier(.2,1.4,.4,1)',
    }}>
      <div style={{ color: '#dc2626', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.08em' }}>
        <div style={{ fontSize: 28 }}>{winnerName}</div>
        <div style={{ fontSize: 12, borderTop: '2px solid #dc2626', marginTop: 5, paddingTop: 5 }}>{line2}</div>
      </div>
    </div>
  )
}

// ─── split table ──────────────────────────────────────────────────────────────

function SplitTable({ members, shares, tipPayerIdx, tipAmount, displayName, currency }) {
  return (
    <div style={{ marginTop: 8 }}>
      {members.map((m, i) => (
        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
          <span style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#44403c' }}>
            {displayName(m)}
            {tipPayerIdx === i && <span style={{ marginLeft: 6, color: '#dc2626', fontSize: 12 }}>(+TIP)</span>}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tipPayerIdx === i ? '#dc2626' : '#1c1917' }}>
            {fmt(shares[i] + (tipPayerIdx === i ? tipAmount : 0), currency)}
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
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#78716c', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName(m)}
            </span>
            <div style={{ flex: 1, background: '#e7e5e4', borderRadius: 999, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: '#dc2626', borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: '#78716c', width: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
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
  { key: 'one-pays',  label: '🎯 One Pays',   desc: 'One person covers the whole bill.' },
  { key: 'split',     label: '✂️ Split',       desc: 'Everyone splits the bill equally.' },
  { key: 'loser-tip', label: '💸 Loser Tips',  desc: 'Split bill evenly, one person pays the tip.' },
]
const TIP_PRESETS = [10, 15, 18, 20, 25]

export default function App() {
  const [members, setMembers] = useState(() => [makeMember(), makeMember(), makeMember()])
  const [mode, setMode] = useState('one-pays')
  const [billAmount, setBillAmount] = useState('')
  const [tipValue, setTipValue] = useState('')
  const [tipType, setTipType] = useState('pct')
  const [splitTip, setSplitTip] = useState(false)        // in Split mode: include tip evenly
  const [splitTipValue, setSplitTipValue] = useState('') // tip % for split-with-tip
  const [roundUp, setRoundUp] = useState(false)          // round each share up to nearest $
  const [fairMode, setFairMode] = useState(false)
  const [currency, setCurrency] = useState('USD')
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
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

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

  const computeTip = useCallback(() => {
    const bill = parseFloat(billAmount) || 0
    const val = parseFloat(tipValue) || 0
    return tipType === 'pct' ? (bill * val) / 100 : val
  }, [billAmount, tipValue, tipType])

  const computeSplitTip = useCallback(() => {
    const bill = parseFloat(billAmount) || 0
    const pct = parseFloat(splitTipValue) || 0
    return (bill * pct) / 100
  }, [billAmount, splitTipValue])

  const finalise = useCallback((winner) => {
    const bill = parseFloat(billAmount) || 0
    const n = members.length
    let shares = Array(n).fill(0)
    let tipPayerIdx = null
    let tipAmount = 0

    if (mode === 'split') {
      const total = splitTip ? bill + computeSplitTip() : bill
      shares = splitEvenly(total, n)
      if (roundUp) shares = roundUp(shares)
    }
    if (mode === 'loser-tip') {
      shares = splitEvenly(bill, n)
      if (roundUp) shares = roundUp(shares)
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
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }), 100)
  }, [billAmount, members, mode, computeTip, computeSplitTip, splitTip, roundUp, reducedMotion])

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
      buzz(4)
      elapsed += interval
      interval = 70 + (elapsed / duration) ** 2 * 520
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
    const winner = displayName(result.winner)
    const sym = CURRENCIES.find(c => c.code === currency)?.symbol ?? '$'
    let text = `🧾 WHO PAYS THE BILL?\n${'─'.repeat(28)}\n`

    if (result.mode === 'one-pays') {
      text += `👉 ${winner} PAYS THE WHOLE BILL! 🎯\n`
    } else if (result.mode === 'loser-tip') {
      text += `💸 ${winner} GOT THE TIP!\n\n`
      members.forEach((m, i) => {
        const share = result.shares[i] + (result.tipPayerIdx === i ? result.tipAmount : 0)
        text += `  ${displayName(m)}: ${fmt(share, currency)}\n`
      })
      text += `${'─'.repeat(28)}\nTotal: ${fmt(grandTotal, currency)}\n`
    } else {
      text += `✂️ EVERYONE SPLITS EVENLY!\n\n`
      members.forEach((m, i) => {
        text += `  ${displayName(m)}: ${fmt(result.shares[i], currency)}\n`
      })
      text += `${'─'.repeat(28)}\nTotal: ${fmt(bill, currency)}\n`
    }
    text += `\n${result.timestamp}`

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Who Pays the Bill?', text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        showToast('Copied! Paste it in the group chat 📋')
      } else {
        showToast('Sharing not supported on this device')
      }
    } catch { /* cancelled */ }
  }

  useEffect(() => () => {
    clearTimeout(spinTimer.current)
    clearTimeout(confettiTimer.current)
    clearTimeout(toastTimer.current)
  }, [])

  const bill = parseFloat(billAmount) || 0
  const tipAmt = computeTip()
  const splitTipAmt = computeSplitTip()
  const grandTotal = mode === 'loser-tip' ? bill + tipAmt : splitTip ? bill + splitTipAmt : bill
  const needsBill = mode === 'split' || mode === 'loser-tip'
  const odds = getOdds(members, history, fairMode)

  const canStamp =
    phase !== 'spinning' &&
    members.length >= 2 &&
    (mode === 'one-pays' ||
     (mode === 'split' && bill > 0) ||
     (mode === 'loser-tip' && bill > 0 && parseFloat(tipValue) > 0))

  const hint =
    phase === 'spinning' ? '' :
    needsBill && bill <= 0 ? '⬆ Enter the bill total to continue' :
    mode === 'loser-tip' && bill > 0 && !(parseFloat(tipValue) > 0) ? '⬆ Set the tip to continue' :
    ''

  const currentMode = MODES.find(m => m.key === mode)
  const currInfo = CURRENCIES.find(c => c.code === currency)

  // ── shared styles ─────────────────────────────────────────────────────────
  const paper = {
    background: '#faf9f7',
    fontFamily: "'Courier New', Courier, ui-monospace, monospace",
    color: '#1c1917', fontSize: 14, lineHeight: 1.5,
  }
  const labelSt = {
    fontSize: 11, color: '#a8a29e',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
  }
  const inputSt = {
    background: 'transparent', borderBottom: '1px dashed #a8a29e',
    color: '#1c1917', fontSize: 16, padding: '6px 4px', fontFamily: 'inherit',
    outline: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums', width: 110,
  }
  const stepBtnSt = enabled => ({
    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
    fontSize: 26, fontWeight: 900, fontFamily: 'inherit',
    border: '2px solid', borderColor: enabled ? '#1c1917' : '#d6d3d1',
    background: enabled ? '#1c1917' : '#f5f5f4',
    color: enabled ? '#faf9f7' : '#a8a29e',
    cursor: enabled ? 'pointer' : 'not-allowed',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, padding: 0, transition: 'all 0.12s',
    WebkitTapHighlightColor: 'transparent',
  })
  const actionBtnSt = {
    flex: 1, padding: '12px 0', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', minHeight: 46,
    border: '1.5px solid #d6d3d1', borderRadius: 10, background: 'transparent',
    color: '#57534e', cursor: 'pointer',
  }
  const toggleRowSt = {
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
    fontSize: 13, color: '#57534e', userSelect: 'none',
    padding: '9px 10px', borderRadius: 8, background: '#f5f5f4', marginBottom: 6,
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 55% 20%, #92400e 0%, #3c1a06 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 10px 48px',
    }}>
      <Confetti show={confetti} />
      <Toast message={toast} />

      <div style={{ ...paper, width: '100%', maxWidth: 420, boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)' }}>

        <div style={{ background: '#92400e', padding: '4px 0' }}><Perforation /></div>

        <div style={{ padding: '20px 22px 16px' }}>

          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: '#a8a29e', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.18em', marginTop: 4 }}>THE BILL</div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.35em', color: '#78716c' }}>D E C I D E R</div>
            <div style={{ fontSize: 11, color: '#a8a29e', letterSpacing: '0.2em', marginTop: 4 }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
            <div style={{ fontSize: 11, color: '#78716c', marginTop: 8, letterSpacing: '0.04em', lineHeight: 1.7 }}>
              TABLE FOR {members.length}<br />
              {headerTimestamp()}
            </div>
            <div style={{ fontSize: 12, color: '#57534e', marginTop: 6, fontStyle: 'italic' }}>
              Let fate decide who pays. 🍽️
            </div>
          </div>

          <Divider />

          {/* ── 1 · CURRENCY ─────────────────────────────────────────────── */}
          <div style={labelSt}>Currency</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => { setCurrency(c.code); buzz(6) }}
                style={{
                  flex: 1, padding: '8px 4px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  borderRadius: 8, cursor: 'pointer', minHeight: 40,
                  border: currency === c.code ? '1.5px solid #1c1917' : '1px solid #d6d3d1',
                  background: currency === c.code ? '#1c1917' : 'transparent',
                  color: currency === c.code ? '#faf9f7' : '#57534e',
                }}
                aria-pressed={currency === c.code}
              >
                {c.symbol} {c.label}
              </button>
            ))}
          </div>

          <Divider />

          {/* ── 2 · MODE ─────────────────────────────────────────────────── */}
          <div style={labelSt}>1 · Pick a Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); again(); buzz(8) }}
                style={{
                  fontSize: 12, fontFamily: 'inherit', fontWeight: 700,
                  padding: '10px 4px', borderRadius: 8, cursor: 'pointer', minHeight: 52,
                  border: mode === m.key ? '1.5px solid #1c1917' : '1px solid #d6d3d1',
                  background: mode === m.key ? '#1c1917' : 'transparent',
                  color: mode === m.key ? '#faf9f7' : '#57534e',
                  lineHeight: 1.3, transition: 'all 0.12s', WebkitTapHighlightColor: 'transparent',
                }}
                aria-pressed={mode === m.key}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#78716c', textAlign: 'center', marginBottom: 4 }}>
            {currentMode.desc}
          </div>

          <Divider />

          {/* ── 3 · PARTY ────────────────────────────────────────────────── */}
          <div style={labelSt}>2 · Who's at the Table?</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14 }}>
            <button onClick={() => setPartySize(members.length - 1)} disabled={members.length <= 2}
              style={stepBtnSt(members.length > 2)} aria-label="One fewer person">−</button>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>{members.length}</div>
              <div style={{ fontSize: 11, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>People</div>
            </div>
            <button onClick={() => setPartySize(members.length + 1)} disabled={members.length >= 10}
              style={stepBtnSt(members.length < 10)} aria-label="One more person">+</button>
          </div>

          <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 4 }}>
            Tap a name to edit{fairMode ? ' · right column = % chance of being picked' : ''}:
          </div>
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
                odds={odds[i]}
                fairMode={fairMode}
              />
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={toggleRowSt}>
              <input type="checkbox" checked={fairMode}
                onChange={e => { setFairMode(e.target.checked); buzz(8) }}
                style={{ accentColor: '#dc2626', width: 18, height: 18, flexShrink: 0 }} />
              <span><strong>Fair mode</strong> — lower odds for frequent payers</span>
            </label>
          </div>

          {/* ── 4 · BILL ─────────────────────────────────────────────────── */}
          {needsBill && (
            <>
              <Divider />
              <div style={labelSt}>3 · The Bill</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Bill total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ color: '#78716c', fontSize: 15 }}>{currInfo?.symbol}</span>
                  <input type="number" inputMode="decimal" min="0" step="0.01"
                    value={billAmount} onChange={e => setBillAmount(e.target.value)}
                    placeholder="0.00" style={inputSt} aria-label="Bill total" />
                </div>
              </div>

              {/* round-up toggle */}
              <label style={{ ...toggleRowSt, marginBottom: 10 }}>
                <input type="checkbox" checked={roundUp}
                  onChange={e => { setRoundUp(e.target.checked); buzz(6) }}
                  style={{ accentColor: '#dc2626', width: 18, height: 18, flexShrink: 0 }} />
                <span><strong>Round up</strong> — round each share to the nearest whole number</span>
              </label>

              {/* split mode: optional tip split */}
              {mode === 'split' && (
                <>
                  <label style={toggleRowSt}>
                    <input type="checkbox" checked={splitTip}
                      onChange={e => { setSplitTip(e.target.checked); setSplitTipValue(''); buzz(6) }}
                      style={{ accentColor: '#dc2626', width: 18, height: 18, flexShrink: 0 }} />
                    <span><strong>Include tip in split</strong> — add tip and split everything equally</span>
                  </label>
                  {splitTip && (
                    <>
                      <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
                        {TIP_PRESETS.map(p => (
                          <button key={p} onClick={() => { setSplitTipValue(String(p)); buzz(6) }}
                            style={{
                              flex: 1, padding: '8px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                              borderRadius: 8, cursor: 'pointer', minHeight: 40,
                              border: String(p) === splitTipValue ? '1.5px solid #dc2626' : '1px solid #d6d3d1',
                              background: String(p) === splitTipValue ? '#fef2f2' : 'transparent',
                              color: String(p) === splitTipValue ? '#dc2626' : '#57534e',
                            }}>
                            {p}%
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#57534e' }}>Or enter tip %</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <input type="number" inputMode="decimal" min="0" step="1"
                            value={splitTipValue} onChange={e => setSplitTipValue(e.target.value)}
                            placeholder="18" style={{ ...inputSt, width: 80 }} aria-label="Tip percentage" />
                          <span style={{ color: '#78716c', fontSize: 14 }}>%</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* loser-tip: tip input */}
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
                        aria-label="Toggle tip type"
                      >
                        {tipType === 'pct' ? '%' : currInfo?.symbol}
                      </button>
                      <input type="number" inputMode="decimal" min="0"
                        step={tipType === 'pct' ? '1' : '0.01'}
                        value={tipValue} onChange={e => setTipValue(e.target.value)}
                        placeholder={tipType === 'pct' ? '18' : '0.00'}
                        style={{ ...inputSt, width: 90 }} aria-label="Tip amount" />
                    </div>
                  </div>
                  {tipType === 'pct' && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {TIP_PRESETS.map(p => (
                        <button key={p} onClick={() => { setTipValue(String(p)); buzz(6) }}
                          style={{
                            flex: 1, padding: '8px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                            borderRadius: 8, cursor: 'pointer', minHeight: 40,
                            border: String(p) === tipValue ? '1.5px solid #dc2626' : '1px solid #d6d3d1',
                            background: String(p) === tipValue ? '#fef2f2' : 'transparent',
                            color: String(p) === tipValue ? '#dc2626' : '#57534e',
                          }}>
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* live preview */}
              {bill > 0 && (
                <div style={{ background: '#f5f5f4', borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#57534e', marginBottom: 2 }}>
                    <span>Each person (base)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {fmt(bill / members.length, currency)}
                    </span>
                  </div>
                  {mode === 'loser-tip' && tipAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#dc2626' }}>
                      <span>Tip (1 unlucky soul)</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmt(tipAmt, currency)}</span>
                    </div>
                  )}
                  {mode === 'split' && splitTip && splitTipAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#57534e' }}>
                      <span>Tip (split equally)</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmt(splitTipAmt / members.length, currency)} each</span>
                    </div>
                  )}
                  {grandTotal > bill && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: '1px solid #e7e5e4' }}>
                      <span>Grand total</span>
                      <span style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal, currency)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <Divider />

          {/* ── DECIDE ───────────────────────────────────────────────────── */}
          <div style={{ ...labelSt, textAlign: 'center' }}>
            {needsBill ? '4' : '3'} · Decide!
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '4px 0' }}>
            <div aria-live="polite" aria-atomic="true"
              style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {phase === 'spinning' && (
                <span style={{
                  fontSize: 24, fontWeight: 900, letterSpacing: '0.12em', color: '#1c1917',
                  animation: 'name-spin 0.4s ease-in-out infinite alternate',
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
                fontSize: 20, fontFamily: 'inherit', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.18em', minHeight: 64,
                border: '2px solid', borderColor: canStamp ? '#1c1917' : '#d6d3d1', borderRadius: 14,
                background: canStamp ? '#1c1917' : '#f5f5f4',
                color: canStamp ? '#faf9f7' : '#a8a29e',
                cursor: canStamp ? 'pointer' : 'not-allowed',
                transition: 'transform 0.08s, background 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={e => { if (canStamp) e.currentTarget.style.transform = 'scale(0.96)' }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
              aria-label="Stamp to decide who pays"
            >
              {phase === 'spinning' ? '▒ DECIDING… ▒' : '🔖 STAMP IT!'}
            </button>
          </div>

          {/* ── RESULT ───────────────────────────────────────────────────── */}
          {phase === 'done' && result && (
            <div ref={resultRef}>
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, margin: '8px 0' }}>

                <Stamp winnerName={displayName(result.winner)} mode={result.mode} />

                {(result.mode === 'split' || result.mode === 'loser-tip') && bill > 0 && (
                  <div style={{ width: '100%' }}>
                    <div style={{ ...labelSt, textAlign: 'center', marginBottom: 8 }}>Breakdown</div>
                    <SplitTable
                      members={members}
                      shares={result.shares}
                      tipPayerIdx={result.tipPayerIdx}
                      tipAmount={result.tipAmount}
                      displayName={displayName}
                      currency={currency}
                    />
                    <Divider solid />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17 }}>
                      <span>TOTAL</span>
                      <span style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal, currency)}</span>
                    </div>
                  </div>
                )}

                {result.mode === 'one-pays' && (
                  <div style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center' }}>
                    Better luck next time, everyone else! 😅
                  </div>
                )}

                <div style={{ fontSize: 11, color: '#a8a29e', textAlign: 'center' }}>{result.timestamp}</div>

                <button onClick={shareResult} style={{
                  width: '100%', padding: '15px 0', fontFamily: 'inherit', fontSize: 15, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.08em', minHeight: 52,
                  border: '2px solid #dc2626', borderRadius: 12, background: '#dc2626', color: '#fff',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}>
                  📲 Share with the Group
                </button>

                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button onClick={() => { again(); buzz(8) }} style={actionBtnSt}>↺ Roll Again</button>
                  <button onClick={reset} style={actionBtnSt}>✕ Reset Tally</button>
                </div>
              </div>
            </div>
          )}

          {/* ── TALLY ────────────────────────────────────────────────────── */}
          <TallyBars members={members} history={history} displayName={displayName} />

          {/* ── FOOTER ───────────────────────────────────────────────────── */}
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
        @keyframes name-spin {
          from { opacity: 0.55; transform: scale(0.95); }
          to   { opacity: 1;    transform: scale(1.05); }
        }
        @keyframes stamp-in {
          0%   { opacity: 0; transform: rotate(-6deg) scale(1.7); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: rotate(-6deg) scale(1); }
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(108vh) rotate(720deg); opacity: 0.85; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 14px); }
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
          *, *::before, *::after { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  )
}
