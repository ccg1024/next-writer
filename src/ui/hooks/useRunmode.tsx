import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { useState, useEffect } from 'react';
import runmode from '../libs/runmode';

type Tokens = {
  text: string;
  style: string | null;
}[];

/**
 * A hooks that return a `span` element which wrapped with codemirror highlight
 */
export const useRunmode = (langName: string, children: React.ReactNode, highlightStyle: HighlightStyle) => {
  const [spans, setSpans] = useState<Tokens>([]);
  const [refresh, setRefresh] = useState<number>(0);

  useEffect(() => {
    const mk = markdown({
      base: markdownLanguage,
      codeLanguages: languages
    });
    const body = children instanceof Array ? children[0] : typeof children === 'string' ? children : '';
    const tokens: Tokens = [];
    runmode(
      body as string,
      mk.language,
      (text: string, style: string | null, _from: number, _to: number) => {
        tokens.push({ text, style });
      },
      highlightStyle,
      () => {
        setRefresh(refresh + 1);
      }
    );
    setSpans(tokens);
  }, [children, refresh]);

  return spans;
};
