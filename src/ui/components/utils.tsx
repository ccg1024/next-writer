import styled from '@emotion/styled'
import { AnimatePresence, motion } from 'framer-motion'
import { FC, PropsWithChildren, ReactNode } from 'react'
import { createPortal } from 'react-dom'

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

export const InlineFlex = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
  line-height: 1;
`

type AnimateClickDivProps = {
  child: ReactNode
}

export const AnimateClickDiv: FC<AnimateClickDivProps> = props => {
  return <motion.div whileTap={{ scale: 0.6 }}>{props.child}</motion.div>
}

type MaskProps = {
  isMediaControl?: boolean
}
export const Mask = styled.div<MaskProps>`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => (props.isMediaControl ? 'none' : 'block')};
  @media (max-width: 700px) {
    display: block;
  }
`

export const GlobalMask: FC<MaskProps> = props => {
  return createPortal(<Mask {...props} />, document.body)
}
