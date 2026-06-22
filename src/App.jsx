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
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  })
}

// ─── receipt chrome ───────────────────────────────────────────────────────────

function Perforation() {
  return (
    <div className="flex items-center overflow-hidden h-5">
      {Array.from({ length: 44 }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ background: '#92400e', margin: '-2px' }}
        />
      ))}
    </div>
  )
}

function Divider({ solid = false }) {
  return (
    <div
      className="my-3"
      style={{ borderTop: `1px ${solid ? 'solid' : 'dashed'} #a8a29e` }}
    />
  )
}

// ─── member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, index, total, onNameChange, onRemove, canRemove, pickCount }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span style={{ color: '#78716c', fontSize: 11, width: 16, textAlign: 'right', flexShrink: 0 }}>
        {index + 1}.
      </span>
      <input
        type="text"
        value={member.name}
        onChange={e => onNameChange(member.id, e.target.value)}
        placeholder={`PERSON ${index + 1}`}
        maxLength={20}
        style={{
          flex: 1, background: 'transparent',
          borderBottom: '1px dashed #a8a29e',
          color: '#1c1917', fontSize: 13,
          padding: '2px 4px', fontFamily: 'inherit',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          outline: 'none',
        }}
        onFocus={e => { e.target.style.borderBottomColor = '#1c1917' }}
        onBlur={e => { e.target.style.borderBottomColor = '#a8a29e' }}
        aria-label={`Name for person ${index + 1}`}
      />
      {pickCount > 0 && (
        <span style={{ color: '#78716c', fontSize: 11, flexShrink: 0 }} title="Times picked this session">
          ×{pickCount}
        </span>
      )}
      {canRemove && (
        <button
          onClick={() => onRemove(member.id)}
          style={{
            color: '#a8a29e', fontSize: 11, width: 18, height: 18,
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3, padding: 0,
          }}
          onMouseEnter={e => { e.target.style.color = '#dc2626' }}
          onMouseLeave={e => { e.target.style.color = '#a8a29e' }}
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
        padding: '8px 20px',
        transform: 'rotate(-6deg)',
        boxShadow: '0 0 0 1px #dc2626 inset, 2px 4px 12px rgba(220,38,38,0.25)',
        userSelect: 'none',
      }}
    >
      <div style={{ color: '#dc2626', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.1em' }}>
        <div style={{ fontSize: 26 }}>{winnerName}</div>
        <div style={{ fontSize: 11, borderTop: '2px solid #dc2626', marginTop: 4, paddingTop: 4 }}>{line2}</div>
      </div>
    </div>
  )
}

// ─── split table ──────────────────────────────────────────────────────────────

function SplitTable({ members, shares, tipPayerIdx, tipAmount, displayName }) {
  return (
    <div style={{ marginTop: 8 }}>
      {members.map((m, i) => (
        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0' }}>
          <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#44403c' }}>
            {displayName(m)}
            {tipPayerIdx === i && (
              <span style={{ marginLeft: 6, color: '#dc2626', fontSize: 11 }}>(+TIP)</span>
            )}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: tipPayerIdx === i ? '#dc2626' : '#1c1917',
          }}>
            {fmt(shares[i] + (tipPayerIdx === i ? tipAmount : 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── tally bar ───────────────────────────────────────────────────────────────

function TallyBars({ members, history, displayName }) {
  const max = Math.max(...members.map(m => history[m.id] ?? 0), 1)
  const hasTally = members.some(m => (history[m.id] ?? 0) > 0)
  if (!hasTally) return null

  return (
    <>
      <Divider />
      <div style={{ fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        Session Tally
      </div>
      {members.map(m => {
        const count = history[m.id] ?? 0
        if (count === 0) return null
        const pct = (count / max) * 100
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#78716c', width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName(m)}
            </span>
            <div style={{ flex: 1, background: '#e7e5e4', borderRadius: 999, height: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#dc2626', borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: '#a8a29e', width: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
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
  { key: 'one-pays',  label: 'ONE PAYS' },
  { key: 'split',     label: 'SPLIT EVENLY' },
  { key: 'loser-tip', label: 'LOSER TIPS' },
]

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

  const reducedMotion = useReducedMotion()
  const spinTimer = useRef(null)

  const displayName = useCallback(
    m => (m.name.trim() ? m.name.trim().toUpperCase() : `PERSON ${members.indexOf(m) + 1}`),
    [members]
  )

  // members
  const addMember = () => { if (members.length < 10) setMembers(ms => [...ms, makeMember()]) }
  const removeMember = id => { if (members.length > 2) setMembers(ms => ms.filter(m => m.id !== id)) }
  const updateName = (id, name) => setMembers(ms => ms.map(m => m.id === id ? { ...m, name } : m))

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
    setResult({ winner, shares, tipPayerIdx, tipAmount, timestamp: nowString() })
    setPhase('done')
  }, [billAmount, members, mode, computeTip])

  const stamp = () => {
    if (phase === 'spinning') return
    const winner = pickWeighted(members, history, fairMode)

    if (reducedMotion) {
      finalise(winner)
      return
    }

    setPhase('spinning')
    setResult(null)

    let elapsed = 0
    const duration = 2400
    let interval = 70

    const spin = () => {
      const idx = Math.floor(Math.random() * members.length)
      setSpinName(displayName(members[idx]).toUpperCase())
      elapsed += interval
      const progress = elapsed / duration
      interval = 70 + progress * progress * 500

      if (elapsed >= duration) {
        clearTimeout(spinTimer.current)
        setSpinName(displayName(winner).toUpperCase())
        setTimeout(() => finalise(winner), 350)
        return
      }
      spinTimer.current = setTimeout(spin, interval)
    }
    spinTimer.current = setTimeout(spin, interval)
  }

  const again = () => { setPhase('idle'); setResult(null); setSpinName('') }
  const reset = () => { setPhase('idle'); setResult(null); setSpinName(''); setHistory({}) }

  useEffect(() => () => clearTimeout(spinTimer.current), [])

  const bill = parseFloat(billAmount) || 0
  const tipAmt = computeTip()
  const grandTotal = bill + (mode === 'loser-tip' ? tipAmt : 0)

  const canStamp =
    phase !== 'spinning' &&
    members.length >= 2 &&
    (mode === 'one-pays' ||
     (mode === 'split' && bill > 0) ||
     (mode === 'loser-tip' && bill > 0 && parseFloat(tipValue) > 0))

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric',
  })

  // ── receipt paper styles ──────────────────────────────────────────────────

  const paper = {
    background: '#faf9f7',
    fontFamily: "'Courier New', Courier, ui-monospace, monospace",
    color: '#1c1917',
    fontSize: 13,
    lineHeight: 1.5,
  }

  const labelStyle = {
    fontSize: 10, color: '#a8a29e',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
  }

  const inputStyle = {
    background: 'transparent',
    borderBottom: '1px dashed #a8a29e',
    color: '#1c1917',
    fontSize: 13,
    padding: '2px 4px',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    width: 96,
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 55% 25%, #92400e 0%, #3c1a06 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 12px 48px',
    }}>

      {/* receipt */}
      <div style={{
        ...paper,
        width: '100%', maxWidth: 380,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)',
      }}>

        {/* top perf */}
        <div style={{ background: '#92400e', padding: '4px 0' }}>
          <Perforation />
        </div>

        <div style={{ padding: '20px 24px 16px' }}>

          {/* ── header ──────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#a8a29e', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.2em', marginTop: 4 }}>THE BILL</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.35em', color: '#78716c' }}>D E C I D E R</div>
            <div style={{ fontSize: 10, color: '#a8a29e', letterSpacing: '0.2em', marginTop: 4 }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
            <div style={{ fontSize: 11, color: '#78716c', marginTop: 6, letterSpacing: '0.05em' }}>
              TABLE FOR {members.length} &nbsp;·&nbsp; {dateStr}
            </div>
          </div>

          <Divider />

          {/* ── mode tabs ───────────────────────────────────────────────── */}
          <div style={labelStyle}>Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); again() }}
                style={{
                  fontSize: 10, fontFamily: 'inherit', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '7px 4px', borderRadius: 3, cursor: 'pointer',
                  border: mode === m.key ? '1px solid #1c1917' : '1px solid #d6d3d1',
                  background: mode === m.key ? '#1c1917' : 'transparent',
                  color: mode === m.key ? '#faf9f7' : '#78716c',
                  lineHeight: 1.2,
                  transition: 'all 0.15s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <Divider />

          {/* ── members ─────────────────────────────────────────────────── */}
          <div style={labelStyle}>Party Members</div>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button
              onClick={addMember}
              disabled={members.length >= 10}
              style={{
                flex: 1, fontSize: 11, fontFamily: 'inherit', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '6px 0', borderRadius: 3, cursor: members.length >= 10 ? 'not-allowed' : 'pointer',
                border: '1px dashed #a8a29e', background: 'transparent',
                color: members.length >= 10 ? '#d6d3d1' : '#78716c',
              }}
              onMouseEnter={e => { if (members.length < 10) e.currentTarget.style.color = '#1c1917' }}
              onMouseLeave={e => { e.currentTarget.style.color = members.length >= 10 ? '#d6d3d1' : '#78716c' }}
            >
              + ADD MEMBER
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={fairMode}
                onChange={e => setFairMode(e.target.checked)}
                style={{ accentColor: '#1c1917', width: 12, height: 12 }}
              />
              FAIR MODE
            </label>
          </div>

          {fairMode && (
            <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 4, fontStyle: 'italic' }}>
              * Reduces odds for frequent payers
            </div>
          )}

          <Divider />

          {/* ── bill inputs ─────────────────────────────────────────────── */}
          {(mode === 'split' || mode === 'loser-tip') && (
            <>
              <div style={labelStyle}>Bill Details</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtotal</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: '#78716c', fontSize: 13 }}>$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                    aria-label="Bill subtotal in dollars"
                  />
                </div>
              </div>

              {mode === 'loser-tip' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tip</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setTipType(t => t === 'pct' ? 'amt' : 'pct')}
                      style={{
                        fontSize: 11, fontFamily: 'inherit', fontWeight: 700,
                        width: 24, height: 24, borderRadius: 3, cursor: 'pointer',
                        border: '1px solid #d6d3d1', background: 'transparent',
                        color: '#78716c',
                      }}
                      aria-label="Toggle tip type between percentage and dollar amount"
                    >
                      {tipType === 'pct' ? '%' : '$'}
                    </button>
                    <input
                      type="number" min="0"
                      step={tipType === 'pct' ? '1' : '0.01'}
                      value={tipValue}
                      onChange={e => setTipValue(e.target.value)}
                      placeholder={tipType === 'pct' ? '18' : '0.00'}
                      style={{ ...inputStyle, width: 72 }}
                      aria-label={`Tip ${tipType === 'pct' ? 'percentage' : 'dollar amount'}`}
                    />
                  </div>
                </div>
              )}

              {bill > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#78716c', marginBottom: 2 }}>
                  <span>PER PERSON (BASE)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(bill / members.length)}</span>
                </div>
              )}
              {mode === 'loser-tip' && bill > 0 && tipAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#dc2626', marginBottom: 2 }}>
                  <span>TIP (1 UNLUCKY SOUL)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(tipAmt)}</span>
                </div>
              )}

              <Divider />
            </>
          )}

          {/* ── stamp button ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: '12px 0' }}>

            {/* spinning name display */}
            <div
              aria-live="polite"
              aria-atomic="true"
              style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
            >
              {phase === 'spinning' && (
                <span style={{
                  fontSize: 20, fontWeight: 900, letterSpacing: '0.15em',
                  color: '#1c1917',
                  animation: 'pulse 0.4s ease-in-out infinite alternate',
                }}>
                  {spinName}
                </span>
              )}
            </div>

            <button
              onClick={stamp}
              disabled={!canStamp}
              style={{
                width: '100%', padding: '14px 0',
                fontSize: 16, fontFamily: 'inherit', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.2em',
                border: '2px solid',
                borderColor: canStamp ? '#1c1917' : '#d6d3d1',
                borderRadius: 4,
                background: canStamp ? '#1c1917' : '#f5f5f4',
                color: canStamp ? '#faf9f7' : '#a8a29e',
                cursor: canStamp ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (canStamp) e.currentTarget.style.background = '#292524' }}
              onMouseLeave={e => { if (canStamp) e.currentTarget.style.background = '#1c1917' }}
              aria-label="Stamp to decide who pays"
            >
              {phase === 'spinning' ? '▒ DECIDING... ▒' : '🔖  STAMP IT!'}
            </button>
          </div>

          {/* ── result ───────────────────────────────────────────────────── */}
          {phase === 'done' && result && (
            <>
              <Divider />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, margin: '8px 0' }}>

                <Stamp
                  winnerName={displayName(result.winner)}
                  mode={mode}
                />

                {(mode === 'split' || mode === 'loser-tip') && bill > 0 && (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                      <span>TOTAL</span>
                      <span style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal)}</span>
                    </div>
                  </div>
                )}

                {mode === 'one-pays' && (
                  <div style={{ fontSize: 11, color: '#a8a29e', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Better luck next time, everyone else!
                  </div>
                )}

                <div style={{ fontSize: 10, color: '#a8a29e', textAlign: 'center', letterSpacing: '0.05em' }}>
                  {result.timestamp}
                </div>

                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button
                    onClick={again}
                    style={{
                      flex: 1, padding: '8px 0', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      border: '1px solid #d6d3d1', borderRadius: 3, background: 'transparent',
                      color: '#78716c', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#1c1917'; e.currentTarget.style.borderColor = '#1c1917' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#78716c'; e.currentTarget.style.borderColor = '#d6d3d1' }}
                  >
                    ↺ AGAIN
                  </button>
                  <button
                    onClick={reset}
                    style={{
                      flex: 1, padding: '8px 0', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      border: '1px solid #d6d3d1', borderRadius: 3, background: 'transparent',
                      color: '#78716c', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#78716c'; e.currentTarget.style.borderColor = '#d6d3d1' }}
                  >
                    ✕ RESET TALLY
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── history tally ─────────────────────────────────────────────── */}
          <TallyBars members={members} history={history} displayName={displayName} />

          {/* ── footer ───────────────────────────────────────────────────── */}
          <Divider />
          <div style={{ textAlign: 'center', fontSize: 10, color: '#a8a29e', letterSpacing: '0.08em', lineHeight: 1.8 }}>
            <div style={{ textTransform: 'uppercase' }}>Thank You For Dining With Us</div>
            <div>No disputes accepted after stamping.</div>
            <div style={{ marginTop: 4, letterSpacing: '0.15em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
          </div>

        </div>

        {/* bottom perf */}
        <div style={{ background: '#92400e', padding: '4px 0' }}>
          <Perforation />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.6; transform: scale(0.97); }
          to   { opacity: 1;   transform: scale(1.03); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
