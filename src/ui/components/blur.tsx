import { css } from '@emotion/css'
import { FC, useRef } from 'react'
import { useHoverShow } from '../hooks/useHoverShow'

type BlurProps = {
  top?: string
  bottom?: string
  background?: string
}
export const Blur: FC<BlurProps> = props => {
  const refDiv = useRef<HTMLDivElement>(null)
  const visible = useHoverShow<HTMLDivElement>({
    target: refDiv
  })
  const style = () => {
    const radius = 'var(--nw-border-radius-md)'
    return props.top
      ? { top: props.top, borderRadius: `${radius} ${radius} 0 0` }
      : { bottom: props.bottom, borderRadius: `0 0 ${radius} ${radius}` }
  }
  return (
    <div
      ref={refDiv}
      className={css({
        width: '100%',
        height: '20vh',
        position: 'absolute',
        background: props.background
          ? props.background
          : 'linear-gradient(white, transparent)',
        ...style(),
        backdropFilter: 'blur(3px) opacity(0.8)',
        opacity: visible ? 0 : 1
      })}
    ></div>
  )
}

export const VerticalBlur = () => {
  return (
    <>
      <Blur top="0" />
      <Blur bottom="0" background="linear-gradient(transparent, white)" />
    </>
  )
}
