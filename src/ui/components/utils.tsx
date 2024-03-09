import styled from '@emotion/styled'
import { AnimatePresence, motion } from 'framer-motion'
import { FC, PropsWithChildren } from 'react'

interface HoverBoxProps {
  x: 'left' | 'right'
  y: 'top' | 'bottom'
  xOffset?: number | string
  yOffset?: number | string
  nTranslate?: string
  zIndex?: number
}

export const HoverBox = styled.div<HoverBoxProps>`
  position: absolute;
  left: ${props =>
    props.x === 'left' ? (props.xOffset != null ? props.xOffset : 0) : 'unset'};
  right: ${props =>
    props.x === 'right'
      ? props.xOffset != null
        ? props.xOffset
        : 0
      : 'unset'};
  bottom: ${props =>
    props.y === 'bottom'
      ? props.yOffset != null
        ? props.yOffset
        : 0
      : 'unset'};
  top: ${props =>
    props.y === 'top' ? (props.yOffset != null ? props.yOffset : 0) : 'unset'};
  background-color: white;
  box-shadow: var(--nw-box-shadow-lg);
  padding: 10px;
  border-radius: var(--nw-border-radius-md);
  transform: ${props =>
    props.nTranslate ? `translate(${props.nTranslate})` : 'unset'};
  z-index: ${props => (props.zIndex ? props.zIndex : 0)};
`

interface AnimateHoverBoxProps extends HoverBoxProps {
  visible: boolean
}

export const AnimateHoverBoxCoords = styled.div<HoverBoxProps>`
  position: absolute;
  left: ${props =>
    props.x === 'left' ? (props.xOffset != null ? props.xOffset : 0) : 'unset'};
  right: ${props =>
    props.x === 'right'
      ? props.xOffset != null
        ? props.xOffset
        : 0
      : 'unset'};
  bottom: ${props =>
    props.y === 'bottom'
      ? props.yOffset != null
        ? props.yOffset
        : 0
      : 'unset'};
  top: ${props =>
    props.y === 'top' ? (props.yOffset != null ? props.yOffset : 0) : 'unset'};
  transform: ${props =>
    props.nTranslate ? `translate(${props.nTranslate})` : 'unset'};
  z-index: ${props => (props.zIndex ? props.zIndex : 0)};
`

const RoundedCornersBox = styled.div`
  background-color: white;
  border-radius: var(--nw-border-radius-md);
  box-shadow: var(--nw-box-shadow-lg);
  padding: 10px;
  max-width: 25vw;
  word-break: break-all;
`

export const AnimateHoverBox: FC<
  AnimateHoverBoxProps & PropsWithChildren
> = props => {
  const { visible, children, ...rest } = props

  return (
    <AnimateHoverBoxCoords {...rest}>
      <AnimatePresence mode="wait" initial={false}>
        {visible && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RoundedCornersBox>{children}</RoundedCornersBox>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimateHoverBoxCoords>
  )
}
