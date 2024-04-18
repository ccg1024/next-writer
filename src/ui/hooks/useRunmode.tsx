import { useState, useEffect } from 'react'
import runmode, { getLanguage } from '../libs/runmode'

type Tokens = {
  text: string
  style: string | null
}[]

/**
 * A hooks that return a `span` element which wrapped with codemirror highlight
 */
export const useRunmode = (langName: string, children: React.ReactNode) => {
  const [spans, setSpans] = useState<Tokens>([])

  useEffect(() => {
    getLanguage(langName).then(language => {
      if (language) {
        const body =
          children instanceof Array
            ? children[0]
            : typeof children === 'string'
              ? children
              : ''
        const tokens: Tokens = []
        runmode(
          body as string,
          language,
          (text: string, style: string | null, _from: number, _to: number) => {
            tokens.push({ text, style })
          }
        )
        setSpans(tokens)
      }
    })
  }, [children])

  return spans
}
