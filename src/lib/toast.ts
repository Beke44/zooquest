import { useEffect, useState } from 'react'

type Fn = (t: string) => void
const subs = new Set<Fn>()

export function toast(text: string) {
  subs.forEach((f) => f(text))
}

export function useToast() {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const f: Fn = (t) => {
      setText(t)
      clearTimeout(timer)
      timer = setTimeout(() => setText(null), 2600)
    }
    subs.add(f)
    return () => { subs.delete(f); clearTimeout(timer) }
  }, [])
  return text
}
