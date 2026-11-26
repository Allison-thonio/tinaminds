'use client'

import { useEffect, useState } from 'react'

const LINE_ONE = 'Verify your'
const LINE_TWO = 'membership.'
const TOTAL_CHARS = LINE_ONE.length + LINE_TWO.length

export function HeroTypedHeading() {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(false)
  const [hideCursor, setHideCursor] = useState(false)

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setCount(TOTAL_CHARS)
      setDone(true)
      setHideCursor(true)
      return
    }

    let timeoutId: ReturnType<typeof setTimeout>
    let current = 0

    const step = () => {
      current += 1
      setCount(current)
      if (current < TOTAL_CHARS) {
        // Brief natural pause at the line break between "Verify your" and "membership."
        const delay = current === LINE_ONE.length ? 150 : 44
        timeoutId = setTimeout(step, delay)
      } else {
        setDone(true)
        timeoutId = setTimeout(() => setHideCursor(true), 1200)
      }
    }

    timeoutId = setTimeout(step, 180)
    return () => clearTimeout(timeoutId)
  }, [])

  const line1Count = Math.min(count, LINE_ONE.length)
  const line2Count = Math.max(0, count - LINE_ONE.length)
  const cursorOnLine1 = count <= LINE_ONE.length && !done

  const renderCaret = (show: boolean) =>
    show ? (
      <span
        aria-hidden="true"
        className={`typed-caret${done ? ' is-done' : ''}${hideCursor ? ' is-hidden' : ''}`}
      />
    ) : null

  return (
    <h1 aria-label={`${LINE_ONE} ${LINE_TWO}`}>
      <span className="typed-line">
        {LINE_ONE.slice(0, line1Count)}
        {renderCaret(cursorOnLine1)}
        <span aria-hidden="true" className="typed-ghost">
          {LINE_ONE.slice(line1Count)}
        </span>
      </span>
      <br />
      <span className="typed-line">
        {LINE_TWO.slice(0, line2Count)}
        {renderCaret(!cursorOnLine1)}
        <span aria-hidden="true" className="typed-ghost">
          {LINE_TWO.slice(line2Count)}
        </span>
      </span>
    </h1>
  )
}
