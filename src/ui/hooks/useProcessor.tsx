import React, {
  FC,
  createElement,
  Fragment,
  useState,
  useEffect,
  MouseEvent,
  ReactNode,
  ElementType
} from 'react'
import * as prod from 'react/jsx-runtime'
import rehypeKatex from 'rehype-katex'
import rehypeReact from 'rehype-react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { css } from '@emotion/css'
import { useRunmode } from './useRunmode'
import { Post } from '../libs/utils'
import styled from '@emotion/styled'

type PassNode = {
  position?: {
    end: { line: number }
    start: { line: number }
  }
  tagName?: string
}

type _Element<T> = React.DetailedHTMLProps<React.HTMLAttributes<T>, T> & {
  node?: PassNode
}

const getPos = (node: PassNode, pos: 'start' | 'end') => {
  if (!node) return 0
  return pos === 'start' ? node.position?.start.line : node.position?.end.line
}

const Img: FC<HTMLImageElement> = props => {
  const styles = css({
    width: '90%',
    margin: 'auto',
    display: 'block',
    borderRadius: 'var(--nw-border-radius-md)',
    boxShadow: 'var(--nw-box-shadow-md)'
  })
  return (
    <>
      <img className={styles} src={`atom://${props.src}`} alt={props.alt} />
      {props.alt && (
        <span
          style={{
            display: 'block',
            textAlign: 'center',
            marginBlockStart: '0.5em'
          }}
        >
          {props.alt}
        </span>
      )}
    </>
  )
}

const Code: FC<_Element<HTMLElement>> = props => {
  // some
  const { className } = props
  const langName = (className || '').substring(9)

  const spans = useRunmode(langName, props.children)

  if (spans && spans.length > 0) {
    return (
      <code>
        {spans.map((span, i) => (
          <span
            key={i}
            className={span.style || ''}
            style={{ fontFamily: 'var(--nw-editor-code-font-family)' }}
          >
            {span.text}
          </span>
        ))}
      </code>
    )
  }

  return (
    <span
      className={css({
        color: 'var(--nw-theme-inline-code-content)',
        fontFamily: 'var(--nw-editor-code-font-family)'
      })}
    >
      {props.children}
    </span>
  )
}

const Pre: FC<_Element<HTMLElement> & PassNode> = props => {
  return (
    <pre
      className={css({
        padding: '10px',
        boxSizing: 'border-box',
        backgroundColor: '#CCCCCC22',
        overflow: 'auto',
        fontFamily: 'var(--nw-editor-code-font-family)'
      })}
      data-start={getPos(props.node, 'start') + 1}
      data-end={getPos(props.node, 'end') - 1}
    >
      {props.children}
    </pre>
  )
}

const Link: FC<HTMLLinkElement> = props => {
  const click = (e: MouseEvent) => {
    e.preventDefault()
    const link = e.target as HTMLLinkElement
    if (link) {
      Post(
        'render-to-main',
        {
          type: 'open-url-link',
          data: {
            url: link.href
          }
        },
        true
      )
    }
    return false
  }
  return (
    <a href={props.href} onClick={click}>
      {props.children as ReactNode}
    </a>
  )
}

const Blockquote: FC<_Element<HTMLElement>> = props => {
  return (
    <blockquote
      style={{ fontStyle: 'italic', color: 'gray' }}
      data-start={getPos(props.node, 'start')}
      data-end={getPos(props.node, 'end')}
    >
      {props.children}
    </blockquote>
  )
}

const Paragraph: FC<_Element<HTMLElement>> = props => {
  return <p data-start={getPos(props.node, 'start')}>{props.children}</p>
}

const DynamicHead = styled.h1`
  text-decoration: underline;
  text-underline-offset: 6px;
  text-decoration-thikness: 4px;
`
const Head: FC<_Element<HTMLElement>> = props => {
  const tagName = (props?.node ? props.node.tagName : 'h1') as ElementType
  return (
    <DynamicHead data-start={getPos(props.node, 'start')} as={tagName}>
      {props.children}
    </DynamicHead>
  )
}

const UnorderList: FC<_Element<HTMLElement>> = props => {
  return (
    <ul
      data-start={getPos(props.node, 'start')}
      data-end={getPos(props.node, 'end')}
    >
      {props.children}
    </ul>
  )
}
const OrderList: FC<_Element<HTMLElement>> = props => {
  return (
    <ol
      data-start={getPos(props.node, 'start')}
      data-end={getPos(props.node, 'end')}
    >
      {props.children}
    </ol>
  )
}

const production = {
  // @ts-expect-error: the react types are missing.
  Fragment: prod.Fragment,
  // @ts-expect-error: the react types are missing.
  jsx: prod.jsx,
  // @ts-expect-error: the react types are missing.
  jsxs: prod.jsxs,
  passNode: true,
  components: {
    img: Img,
    code: Code,
    pre: Pre,
    a: Link,
    p: Paragraph,
    blockquote: Blockquote,
    h1: Head,
    h2: Head,
    h3: Head,
    h4: Head,
    h5: Head,
    h6: Head,
    ul: UnorderList,
    ol: OrderList
  }
}

const useProcessor = (text: string) => {
  const [content, setContent] = useState(createElement(Fragment))

  useEffect(() => {
    const _run = async () => {
      const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeKatex)
        // @ts-expect-error: the react types are missing.
        .use(rehypeReact, production)
        .process(text)
      setContent(file.result)
    }

    _run()
  }, [text])

  return content
}

export default useProcessor
