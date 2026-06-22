import { useState, useEffect, useRef } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
]

function fmt(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

function splitEvenly(total, count) {
  const base = Math.floor((total * 100) / count)
  const rem = Math.round(total * 100) - base * count
  return Array.from({ length: count }, (_, i) => (base + (i < rem ? 1 : 0)) / 100)
}

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
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); const h = e => setV(e.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h) }, [])
  return v
}

function nowString() {
  return new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

// ─── data ────────────────────────────────────────────────────────────────────

let _id = 1
const uid = () => _id++
const newMember = () => ({ id: uid(), name: '' })

const MODES = [
  { key: 'one-pays',  emoji: '🎯', title: 'One Person Pays',  desc: 'Random draw — one unlucky person covers the whole thing.' },
  { key: 'split',     emoji: '✂️', title: 'Split Evenly',     desc: 'Divide the bill equally between everyone.' },
  { key: 'loser-tip', emoji: '💸', title: 'Tip Roulette',     desc: 'Split the bill, but one random person also pays the tip.' },
]

const TIP_PRESETS = [10, 15, 18, 20, 25]

const AVATAR_BG = ['#e74c3c','#e67e22','#2ecc71','#3498db','#9b59b6','#1abc9c','#e91e63','#ff5722','#607d8b','#795548']

// ─── tiny shared styles ───────────────────────────────────────────────────────

const card = {
  background: '#fff', borderRadius: 20,
  boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden',
}

const primaryBtn = {
  width: '100%', padding: '17px 24px', border: 'none', borderRadius: 16,
  background: '#DC2626', color: '#fff', fontSize: 17, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em',
  WebkitTapHighlightColor: 'transparent', transition: 'opacity 0.15s',
}

const ghostBtn = {
  padding: '14px 20px', border: '1.5px solid #E5E7EB', borderRadius: 14,
  background: '#fff', color: '#374151', fontSize: 15, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
}

// ─── confetti ─────────────────────────────────────────────────────────────────

const PIECES = Array.from({ length: 70 }, (_, i) => ({
  x: Math.random() * 100, d: Math.random() * 0.5,
  t: 2 + Math.random() * 1.5, s: 8 + Math.random() * 9, r: Math.random() * 360,
  c: ['#DC2626','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899'][i % 6],
}))

function Confetti({ on }) {
  if (!on) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 200 }} aria-hidden="true">
      {PIECES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -20, left: `${p.x}%`,
          width: p.s, height: p.s * 0.5, background: p.c, borderRadius: i % 3 === 0 ? '50%' : 2,
          animation: `cf ${p.t}s ${p.d}s ease-in forwards`,
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
      fontSize: 14, fontWeight: 600, zIndex: 300, maxWidth: '90vw', textAlign: 'center',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'toast-in 0.25s ease', whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

// ─── step header ─────────────────────────────────────────────────────────────

function StepHeader({ step, total, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 20,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, WebkitTapHighlightColor: 'transparent',
        }} aria-label="Go back">‹</button>
      )}
      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i <= step ? '#DC2626' : 'rgba(255,255,255,0.25)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── STEP 0 — mode ───────────────────────────────────────────────────────────

function StepMode({ mode, setMode, currency, setCurrency, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#fff', marginBottom: 4 }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>🍽️</div>
        <h1 style={{ margin: '10px 0 6px', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>Who pays?</h1>
        <p style={{ margin: 0, fontSize: 15, opacity: 0.7 }}>Just ate out? Let us settle the bill.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); buzz(8) }} style={{
            ...card,
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
            border: mode === m.key ? '2.5px solid #DC2626' : '2.5px solid transparent',
            background: mode === m.key ? '#FEF2F2' : '#fff',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
          }} aria-pressed={mode === m.key}>
            <span style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 3 }}>{m.title}</div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>{m.desc}</div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: mode === m.key ? '#DC2626' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 900, transition: 'all 0.15s',
            }}>
              {mode === m.key ? '✓' : ''}
            </div>
          </button>
        ))}
      </div>

      {/* currency */}
      <div style={{ ...card, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Currency</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {CURRENCIES.map(c => (
            <button key={c.code} onClick={() => { setCurrency(c.code); buzz(6) }} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, fontFamily: 'inherit',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              border: currency === c.code ? '2px solid #DC2626' : '1.5px solid #E5E7EB',
              background: currency === c.code ? '#FEF2F2' : '#fff',
              color: currency === c.code ? '#DC2626' : '#374151',
            }} aria-pressed={currency === c.code}>
              {c.symbol} {c.code}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onNext} style={primaryBtn}>Next: Add People →</button>
    </div>
  )
}

// ─── avatar chip ─────────────────────────────────────────────────────────────

function AvatarChip({ member, index, editing, onEdit, onNameChange, onDone, onRemove, canRemove, timesChosen }) {
  const inputRef = useRef(null)
  const display = member.name.trim() || `Person ${index + 1}`
  const initial = member.name.trim() ? member.name.trim()[0].toUpperCase() : (index + 1).toString()
  const bg = AVATAR_BG[index % AVATAR_BG.length]

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
      {/* avatar circle */}
      <button onClick={() => { onEdit(); buzz(6) }} style={{
        width: 64, height: 64, borderRadius: '50%', border: editing ? '3px solid #DC2626' : '3px solid transparent',
        background: bg, color: '#fff', fontSize: 24, fontWeight: 900,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        boxShadow: '0 3px 10px rgba(0,0,0,0.18)', WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.15s', position: 'relative',
      }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        aria-label={`Edit name for ${display}`}
      >
        {initial}
        {timesChosen > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#DC2626', color: '#fff', borderRadius: '50%',
            width: 18, height: 18, fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #F9FAFB',
          }}>{timesChosen}</span>
        )}
      </button>

      {/* name / input */}
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
            border: '2px solid #DC2626', borderRadius: 8, padding: '4px 2px',
            outline: 'none', color: '#111',
          }}
          aria-label={`Name for person ${index + 1}`}
        />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
          {display}
        </span>
      )}

      {/* remove */}
      {canRemove && !editing && (
        <button onClick={() => { onRemove(); buzz(8) }} style={{
          fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px 4px', fontFamily: 'inherit',
        }} aria-label={`Remove ${display}`}>remove</button>
      )}
    </div>
  )
}

// ─── STEP 1 — people ─────────────────────────────────────────────────────────

function StepPeople({ members, setMembers, fairMode, setFairMode, history, onBack, onNext }) {
  const [editingId, setEditingId] = useState(null)

  const addPerson = () => {
    if (members.length >= 10) return
    const m = newMember(); setMembers(ms => [...ms, m]); setEditingId(m.id); buzz(8)
  }
  const removePerson = id => { if (members.length > 2) { setMembers(ms => ms.filter(m => m.id !== id)); buzz(8) } }
  const setSize = n => {
    n = Math.max(2, Math.min(10, n))
    setMembers(ms => n > ms.length
      ? [...ms, ...Array.from({ length: n - ms.length }, newMember)]
      : ms.slice(0, n))
    buzz(8)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#fff' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900 }}>Who's at the table?</h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>Add everyone in your group</p>
      </div>

      {/* stepper */}
      <div style={{ ...card, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <button onClick={() => setSize(members.length - 1)} disabled={members.length <= 2} style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: members.length > 2 ? '#111' : '#F3F4F6',
          color: members.length > 2 ? '#fff' : '#D1D5DB',
          fontSize: 28, fontWeight: 900, cursor: members.length > 2 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }} aria-label="Fewer people">−</button>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          <div style={{ fontSize: 46, fontWeight: 900, color: '#111', lineHeight: 1 }}>{members.length}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>people</div>
        </div>
        <button onClick={() => setSize(members.length + 1)} disabled={members.length >= 10} style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: members.length < 10 ? '#111' : '#F3F4F6',
          color: members.length < 10 ? '#fff' : '#D1D5DB',
          fontSize: 28, fontWeight: 900, cursor: members.length < 10 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }} aria-label="More people">+</button>
      </div>

      {/* avatars */}
      <div style={{ ...card, padding: '20px 16px' }}>
        <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Tap an avatar to name them
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 16 }}>
          {members.map((m, i) => (
            <AvatarChip
              key={m.id}
              member={m}
              index={i}
              editing={editingId === m.id}
              onEdit={() => setEditingId(m.id)}
              onNameChange={name => setMembers(ms => ms.map(x => x.id === m.id ? { ...x, name } : x))}
              onDone={() => setEditingId(null)}
              onRemove={() => removePerson(m.id)}
              canRemove={members.length > 2}
              timesChosen={history[m.id] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* fair mode toggle */}
      <label style={{
        ...card, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
        border: fairMode ? '2px solid #DC2626' : '2px solid transparent',
      }}>
        {/* iOS-style toggle */}
        <div style={{
          width: 48, height: 28, borderRadius: 14, flexShrink: 0, position: 'relative',
          background: fairMode ? '#DC2626' : '#D1D5DB', transition: 'background 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: fairMode ? 23 : 3,
            width: 22, height: 22, borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s',
          }} />
          <input type="checkbox" checked={fairMode}
            onChange={e => { setFairMode(e.target.checked); buzz(8) }}
            style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', margin: 0 }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Fair Mode</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            Lowers the odds for people who've already paid this trip
          </div>
        </div>
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={ghostBtn}>← Back</button>
        <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>Next →</button>
      </div>
    </div>
  )
}

// ─── STEP 2 — bill + decide ───────────────────────────────────────────────────

function StepDecide({ mode, members, currency, billAmount, setBillAmount, tipValue, setTipValue, tipType, setTipType, onBack, onStamp, spinning }) {
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol ?? '$'
  const bill = parseFloat(billAmount) || 0
  const tipNum = parseFloat(tipValue) || 0
  const tipAmt = mode === 'loser-tip' ? (tipType === 'pct' ? (bill * tipNum / 100) : tipNum) : 0
  const perPerson = bill > 0 ? bill / members.length : 0
  const needsBill = mode !== 'one-pays'
  const canStamp = !spinning && (!needsBill || (bill > 0 && (mode !== 'loser-tip' || tipAmt > 0)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#fff' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900 }}>
          {needsBill ? "What's the total?" : 'Ready to decide!'}
        </h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
          {needsBill ? `Tap the bill total from the restaurant` : `Everyone's here — time to find out who pays.`}
        </p>
      </div>

      {/* Bill input */}
      {needsBill && (
        <div style={{ ...card, padding: '20px', background: '#111' }}>
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Bill Total
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#6B7280' }}>{sym}</span>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={billAmount} onChange={e => setBillAmount(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 56, fontWeight: 900, color: '#fff', fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums',
              }}
              aria-label="Total bill amount"
            />
          </div>
          {bill > 0 && (
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 8, borderTop: '1px solid #222', paddingTop: 10 }}>
              {sym}{perPerson.toFixed(2)} each &nbsp;·&nbsp; {members.length} people
            </div>
          )}
        </div>
      )}

      {/* Tip (loser-tip only) */}
      {mode === 'loser-tip' && (
        <div style={{ ...card, padding: '18px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111', marginBottom: 12 }}>
            💸 Tip — one random person pays this
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {TIP_PRESETS.map(p => (
              <button key={p} onClick={() => { setTipType('pct'); setTipValue(String(p)); buzz(6) }} style={{
                flex: 1, padding: '10px 2px', borderRadius: 10, fontFamily: 'inherit',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                border: tipType === 'pct' && String(p) === tipValue ? '2px solid #DC2626' : '1.5px solid #E5E7EB',
                background: tipType === 'pct' && String(p) === tipValue ? '#FEF2F2' : '#fff',
                color: tipType === 'pct' && String(p) === tipValue ? '#DC2626' : '#374151',
              }}>{p}%</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setTipType(t => t === 'pct' ? 'amt' : 'pct'); setTipValue('') }} style={{
              padding: '0 16px', height: 46, borderRadius: 10, fontFamily: 'inherit',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #E5E7EB',
              background: '#fff', color: '#374151', flexShrink: 0,
            }}>{tipType === 'pct' ? '%' : sym}</button>
            <input type="number" inputMode="decimal" min="0"
              step={tipType === 'pct' ? '1' : '0.01'}
              value={tipValue} onChange={e => setTipValue(e.target.value)}
              placeholder={tipType === 'pct' ? '18' : '0.00'}
              style={{
                flex: 1, padding: '0 14px', height: 46, borderRadius: 10, fontSize: 16,
                border: '1.5px solid #E5E7EB', outline: 'none', fontFamily: 'inherit', color: '#111',
              }} aria-label="Tip value" />
          </div>
          {bill > 0 && tipAmt > 0 && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#FEF2F2', borderRadius: 10, fontSize: 14, color: '#DC2626', fontWeight: 600 }}>
              Tip = {fmt(tipAmt, currency)} · one person draws this short straw 🥲
            </div>
          )}
        </div>
      )}

      {/* summary for split mode */}
      {mode === 'split' && bill > 0 && (
        <div style={{ ...card, padding: '16px 18px', background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 6 }}>📊 Everyone pays</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#15803D' }}>{fmt(perPerson, currency)} each</div>
        </div>
      )}

      {/* hint */}
      {needsBill && bill <= 0 && (
        <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          ⬆ Enter the bill total to continue
        </div>
      )}
      {mode === 'loser-tip' && bill > 0 && tipAmt <= 0 && (
        <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          ⬆ Set a tip amount to continue
        </div>
      )}

      {/* stamp button */}
      <button
        onClick={() => { if (canStamp) { buzz(20); onStamp() } }}
        style={{
          ...primaryBtn,
          fontSize: 20, padding: '20px 24px', borderRadius: 18,
          opacity: canStamp ? 1 : 0.4,
          cursor: canStamp ? 'pointer' : 'not-allowed',
          animation: canStamp && !spinning ? 'ready-pulse 2s ease-in-out infinite' : 'none',
          marginTop: 4,
        }}
        onTouchStart={e => { if (canStamp) e.currentTarget.style.transform = 'scale(0.96)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        aria-label="Stamp to decide who pays"
      >
        {spinning ? '⏳ Deciding…' : '🔖 STAMP IT!'}
      </button>

      <button onClick={onBack} style={{ ...ghostBtn, width: '100%', textAlign: 'center', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', background: 'transparent' }}>← Back</button>
    </div>
  )
}

// ─── result overlay ───────────────────────────────────────────────────────────

function ResultOverlay({ phase, spinName, result, members, mode, bill, tipAmt, currency, fairMode, history, onAgain, onReset, onClose, reducedMotion }) {
  const displayName = m => {
    const idx = members.findIndex(x => x.id === m.id)
    return (m.name.trim() || `Person ${idx + 1}`).toUpperCase()
  }
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol ?? '$'

  const shareResult = async () => {
    if (!result) return
    const w = displayName(result.winner)
    let text = `🧾 WHO PAYS?\n${'─'.repeat(24)}\n`
    if (mode === 'one-pays') text += `👉 ${w} PAYS THE WHOLE BILL!\n`
    else if (mode === 'loser-tip') {
      text += `💸 ${w} PAYS THE TIP!\n\n`
      members.forEach((m, i) => {
        const share = result.shares[i] + (result.tipPayerIdx === i ? result.tipAmount : 0)
        text += `  ${displayName(m)}: ${fmt(share, currency)}\n`
      })
    } else {
      text += `✂️ EVERYONE SPLITS!\n\n`
      members.forEach((m, i) => text += `  ${displayName(m)}: ${fmt(result.shares[i], currency)}\n`)
    }
    if (result.grandTotal > 0) text += `${'─'.repeat(24)}\nTotal: ${fmt(result.grandTotal, currency)}`
    try {
      if (navigator.share) await navigator.share({ title: 'Who Pays?', text })
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); /* toast handled outside */ }
    } catch { }
  }

  if (!phase) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
    }}>
      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)' }} />

      {/* spinning phase */}
      {phase === 'spinning' && (
        <div style={{
          position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px',
          width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🎲 Picking someone…
          </div>
          <div aria-live="polite" aria-atomic="true" style={{
            fontSize: 64, fontWeight: 900, color: '#fff', letterSpacing: '0.04em',
            textTransform: 'uppercase', lineHeight: 1.1,
            animation: 'spin-name 0.3s ease-in-out infinite alternate',
            textShadow: '0 0 30px rgba(220,38,38,0.5)',
          }}>
            {spinName}
          </div>
        </div>
      )}

      {/* result phase — bottom sheet */}
      {phase === 'result' && result && (
        <>
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 56, animation: reducedMotion ? 'none' : 'winner-emoji 0.6s ease' }}>🎉</div>
          </div>
          <div style={{
            position: 'relative', zIndex: 1, width: '100%', maxHeight: '80vh',
            background: '#FFFBF5', borderRadius: '28px 28px 0 0',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            animation: reducedMotion ? 'none' : 'slide-up 0.45s cubic-bezier(.2,1,.4,1)',
          }}>
            {/* drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
            </div>

            <div style={{ padding: '8px 24px 40px', fontFamily: "'Courier New', Courier, monospace" }}>
              {/* receipt header */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.15em', color: '#111', margin: '6px 0 2px' }}>THE VERDICT</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.2em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{result.timestamp}</div>
              </div>

              {/* THE STAMP */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <div style={{
                  display: 'inline-block', border: '3px solid #DC2626', borderRadius: 4,
                  padding: '10px 28px', transform: 'rotate(-5deg)',
                  boxShadow: '0 0 0 1px #DC2626 inset, 3px 5px 16px rgba(220,38,38,0.3)',
                  userSelect: 'none',
                  animation: reducedMotion ? 'none' : 'stamp-in 0.5s cubic-bezier(.2,1.4,.4,1)',
                }}>
                  <div style={{ color: '#DC2626', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.08em' }}>
                    <div style={{ fontSize: 26 }}>{displayName(result.winner)}</div>
                    <div style={{ fontSize: 11, borderTop: '2px solid #DC2626', marginTop: 5, paddingTop: 5 }}>
                      {mode === 'one-pays' ? 'PAYS THE BILL!' : mode === 'loser-tip' ? 'PAYS THE TIP!' : 'ALL SPLIT!'}
                    </div>
                  </div>
                </div>
              </div>

              {/* breakdown */}
              {(mode === 'split' || mode === 'loser-tip') && bill > 0 && (
                <>
                  <div style={{ borderTop: '1px dashed #D1D5DB', borderBottom: '1px dashed #D1D5DB', padding: '12px 0', margin: '4px 0 12px' }}>
                    {members.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 14 }}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: '#374151' }}>
                          {displayName(m)}
                          {result.tipPayerIdx === i && <span style={{ color: '#DC2626', fontSize: 12, marginLeft: 6 }}>+TIP</span>}
                        </span>
                        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: result.tipPayerIdx === i ? '#DC2626' : '#111' }}>
                          {fmt(result.shares[i] + (result.tipPayerIdx === i ? result.tipAmount : 0), currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, marginBottom: 16 }}>
                    <span>TOTAL</span>
                    <span style={{ color: '#DC2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(result.grandTotal, currency)}</span>
                  </div>
                </>
              )}

              {mode === 'one-pays' && (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                  Better luck next time everyone else! 😅
                </div>
              )}

              {/* tally */}
              {members.some(m => (history[m.id] ?? 0) > 0) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Trip tally
                  </div>
                  {members.map((m, i) => {
                    const c = history[m.id] ?? 0; if (!c) return null
                    const max = Math.max(...members.map(x => history[x.id] ?? 0), 1)
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#6B7280', width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                          {displayName(m)}
                        </span>
                        <div style={{ flex: 1, background: '#E5E7EB', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${(c / max) * 100}%`, height: '100%', background: '#DC2626', borderRadius: 999, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6B7280', width: 16, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 20, letterSpacing: '0.15em' }}>✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦</div>

              {/* actions */}
              <button onClick={shareResult} style={{
                ...primaryBtn, marginBottom: 10, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                📲 Share with the Group
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onAgain} style={{ ...ghostBtn, flex: 1, textAlign: 'center' }}>↺ Roll Again</button>
                <button onClick={onReset} style={{ ...ghostBtn, flex: 1, textAlign: 'center' }}>✕ Reset Tally</button>
              </div>
              <button onClick={onClose} style={{ ...ghostBtn, width: '100%', marginTop: 10, textAlign: 'center', color: '#9CA3AF', borderColor: '#E5E7EB' }}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState('one-pays')
  const [members, setMembers] = useState(() => [newMember(), newMember(), newMember()])
  const [billAmount, setBillAmount] = useState('')
  const [tipValue, setTipValue] = useState('')
  const [tipType, setTipType] = useState('pct')
  const [fairMode, setFairMode] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [history, setHistory] = useState({})

  const [overlayPhase, setOverlayPhase] = useState(null)  // null | spinning | result
  const [spinName, setSpinName] = useState('')
  const [result, setResult] = useState(null)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState('')

  const reducedMotion = useReducedMotion()
  const spinTimer = useRef(null)
  const confettiTimer = useRef(null)
  const toastTimer = useRef(null)

  const displayNameOf = m => {
    const idx = members.findIndex(x => x.id === m.id)
    return m.name.trim() || `Person ${idx + 1}`
  }

  const showToast = msg => {
    setToast(msg); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  const totalSteps = mode === 'one-pays' ? 2 : 3

  const goNext = () => {
    if (step === 0) { setStep(1); return }
    if (step === 1 && mode === 'one-pays') { doStamp(); return }
    if (step === 1) { setStep(2); return }
  }

  const goBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const finalise = winner => {
    const bill = parseFloat(billAmount) || 0
    const n = members.length
    let shares = Array(n).fill(0)
    let tipPayerIdx = null
    let tipAmount = 0

    if (mode === 'split') shares = splitEvenly(bill, n)
    if (mode === 'loser-tip') {
      shares = splitEvenly(bill, n)
      const tipNum = parseFloat(tipValue) || 0
      tipAmount = tipType === 'pct' ? (bill * tipNum / 100) : tipNum
      tipPayerIdx = members.findIndex(m => m.id === winner.id)
    }

    const grandTotal = bill + tipAmount

    setHistory(h => ({ ...h, [winner.id]: (h[winner.id] ?? 0) + 1 }))
    setResult({ winner, shares, tipPayerIdx, tipAmount, grandTotal, timestamp: nowString(), mode })
    setOverlayPhase('result')
    buzz([0, 60, 40, 120])

    if (!reducedMotion) {
      setConfetti(true)
      clearTimeout(confettiTimer.current)
      confettiTimer.current = setTimeout(() => setConfetti(false), 3500)
    }
  }

  const doStamp = () => {
    const winner = pickWeighted(members, history, fairMode)
    if (reducedMotion) { setOverlayPhase('spinning'); setTimeout(() => finalise(winner), 50); return }

    setOverlayPhase('spinning')
    setSpinName(displayNameOf(members[0]))

    let elapsed = 0
    const duration = 2600
    let interval = 70

    const spin = () => {
      const idx = Math.floor(Math.random() * members.length)
      setSpinName(displayNameOf(members[idx]).toUpperCase())
      buzz(4)
      elapsed += interval
      interval = 70 + (elapsed / duration) ** 2 * 560
      if (elapsed >= duration) {
        clearTimeout(spinTimer.current)
        setSpinName(displayNameOf(winner).toUpperCase())
        setTimeout(() => finalise(winner), 400)
        return
      }
      spinTimer.current = setTimeout(spin, interval)
    }
    spinTimer.current = setTimeout(spin, interval)
  }

  const handleAgain = () => {
    setOverlayPhase(null); setResult(null); setSpinName(''); setConfetti(false)
    setStep(mode === 'one-pays' ? 1 : 2)
  }
  const handleReset = () => {
    setOverlayPhase(null); setResult(null); setSpinName(''); setConfetti(false)
    setHistory({}); setStep(0); showToast('Tally cleared 🧼')
  }
  const handleClose = () => {
    setOverlayPhase(null); setResult(null); setSpinName(''); setConfetti(false)
    setStep(0)
  }

  useEffect(() => () => {
    clearTimeout(spinTimer.current); clearTimeout(confettiTimer.current); clearTimeout(toastTimer.current)
  }, [])

  const bill = parseFloat(billAmount) || 0
  const tipNum = parseFloat(tipValue) || 0
  const tipAmt = mode === 'loser-tip' ? (tipType === 'pct' ? (bill * tipNum / 100) : tipNum) : 0

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg, #1a0800 0%, #2d0f00 40%, #1a0800 100%)',
      display: 'flex', justifyContent: 'center', padding: '20px 16px 48px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <StepHeader
          step={step}
          total={totalSteps}
          onBack={step > 0 && !overlayPhase ? goBack : null}
        />

        {step === 0 && (
          <StepMode
            mode={mode} setMode={setMode}
            currency={currency} setCurrency={setCurrency}
            onNext={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <StepPeople
            members={members} setMembers={setMembers}
            fairMode={fairMode} setFairMode={setFairMode}
            history={history}
            onBack={goBack}
            onNext={goNext}
          />
        )}

        {step === 2 && (
          <StepDecide
            mode={mode} members={members} currency={currency}
            billAmount={billAmount} setBillAmount={setBillAmount}
            tipValue={tipValue} setTipValue={setTipValue}
            tipType={tipType} setTipType={setTipType}
            onBack={goBack}
            onStamp={doStamp}
            spinning={overlayPhase === 'spinning'}
          />
        )}

        {/* one-pays: stamp button at bottom of step 1 */}
        {step === 1 && mode === 'one-pays' && (
          <div style={{ marginTop: 16 }}>
            <button onClick={() => { buzz(20); doStamp() }} style={{ ...primaryBtn, fontSize: 20, padding: '20px 24px', borderRadius: 18, animation: 'ready-pulse 2s ease-in-out infinite' }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}>
              🔖 STAMP IT!
            </button>
          </div>
        )}
      </div>

      <ResultOverlay
        phase={overlayPhase}
        spinName={spinName}
        result={result}
        members={members}
        mode={mode}
        bill={bill}
        tipAmt={tipAmt}
        currency={currency}
        fairMode={fairMode}
        history={history}
        onAgain={handleAgain}
        onReset={handleReset}
        onClose={handleClose}
        reducedMotion={reducedMotion}
      />

      <Confetti on={confetti} />
      <Toast msg={toast} />

      <style>{`
        @keyframes cf {
          0%   { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 14px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spin-name {
          from { opacity: 0.5; transform: scale(0.94); }
          to   { opacity: 1;   transform: scale(1.06); }
        }
        @keyframes stamp-in {
          0%   { opacity: 0; transform: rotate(-5deg) scale(1.8); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: rotate(-5deg) scale(1); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes winner-emoji {
          0%  { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100%{ transform: scale(1);   opacity: 1; }
        }
        @keyframes ready-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
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
