import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { AnimatePresence, motion } from 'framer-motion'
import React, {
  FC,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef
} from 'react'
import { createPortal } from 'react-dom'
import { TiFolderAdd, TiDocumentAdd } from 'react-icons/ti'

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
  white-space: nowrap;
`

type AnimateClickDivProps = {
  child: ReactNode
  onClick?: (e: React.MouseEvent) => void
}

export const AnimateClickDiv: FC<AnimateClickDivProps> = props => {
  return (
    <motion.div
      onClick={props.onClick && props.onClick}
      whileTap={{ scale: 0.6 }}
    >
      {props.child}
    </motion.div>
  )
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

export const CircalLoad = styled.div`
  box-sizing: border-box;
  width: var(--nw-size-lg);
  height: var(--nw-size-lg);
  border-radius: var(--nw-border-radius-mx);
  border-width: 2px;
  border-bottom-color: var(--nw-color-transparent);
  border-left-color: var(--nw-color-transparent);
  border-right-color: ${props => (props.color ? props.color : '#333333')};
  border-top-color: ${props => (props.color ? props.color : '#333333')};
  border-style: solid;
  animation: 0.45s linear 0s infinite normal none running animation-rotate;
`
export const Spinner: FC<React.HTMLAttributes<HTMLDivElement>> = props => {
  const { color } = props
  return (
    <div {...props}>
      <CircalLoad color={color} />
    </div>
  )
}

type CloseIconProps = {
  onClick?: () => void
}

export const CloseIcon: FC<CloseIconProps> = props => {
  const wrapper = css`
    width: var(--nw-size-md);
    height: var(--nw-size-md);
    position: relative;
    box-sizing: border-box;
    outline: unset;
  `
  const horizon = css`
    box-sizing: border-box;
    width: 100%;
    height: 2px;
    border-radius: 2px;
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(0, -50%) rotate(45deg);
    background-color: black;
  `
  const vertical = css`
    width: 2px;
    height: 100%;
    border-radius: 2px;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, 0) rotate(45deg);
    background-color: black;
  `
  return (
    <motion.div
      className={wrapper}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.8 }}
      onClick={props.onClick}
    >
      <div className={horizon}></div>
      <div className={vertical}></div>
    </motion.div>
  )
}

type AddEffectProps = {
  wrapperClass?: string
  onClick: (type: string, prefix: string) => (e: React.MouseEvent) => void
  uniq: string
}

export const AddEffect: FC<AddEffectProps> = props => {
  const { wrapperClass, uniq } = props
  const _wrapper = css`
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  `
  return (
    <div className={wrapperClass || _wrapper}>
      <InlineFlex>
        <AnimateClickDiv
          onClick={props.onClick('file', uniq)}
          child={<TiDocumentAdd className="icon-hover" />}
        ></AnimateClickDiv>

        <AnimateClickDiv
          onClick={props.onClick('folder', uniq)}
          child={<TiFolderAdd className="icon-hover" />}
        ></AnimateClickDiv>
      </InlineFlex>
    </div>
  )
}

export function Dialog(props: PropsWithChildren) {
  const refDialog = useRef(null)

  useEffect(() => {
    if (!refDialog.current) return

    const dialog = refDialog.current
    dialog.showModal()
  }, [])

  const cls = css({
    border: 'unset',
    outline: 'unset',
    borderRadius: 'var(--nw-border-radius-md)',
    '&::backdrop': {
      background: 'rgba(0, 0, 0, 0.25)'
    }
  })

  const closeDialog = () => {
    if (!refDialog.current) return

    refDialog.current.close()
  }
  return (
    <dialog ref={refDialog} className={cls}>
      <div
        style={{
          position: 'absolute',
          right: '0.5em',
          top: '0.5em'
        }}
      >
        <CloseIcon onClick={closeDialog} />
      </div>
      <div
        style={{
          padding: '1em'
        }}
      >
        {props.children}
      </div>
    </dialog>
  )
}

export const GlobalLoading = () => {
  const dom = (
    <div
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh'
      })}
    >
      <div
        className={css({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        })}
      ></div>
      <div
        className={css({
          position: 'relative',
          top: '50%',
          transform: 'translateY(-50%)',
          margin: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex'
        })}
      >
        <Spinner />
      </div>
    </div>
  )

  return createPortal(dom, document.body)
}
