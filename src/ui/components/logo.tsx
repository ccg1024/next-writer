import { css } from '@emotion/css'
import { FC, PropsWithChildren } from 'react'
import { MdEditNote, MdOutlineEventNote } from 'react-icons/md'

export const EditLogo: FC = () => {
  return (
    <div className={css({})}>
      <MdEditNote />
    </div>
  )
}

const AbsoluteFull: FC<
  React.HTMLAttributes<HTMLDivElement> & PropsWithChildren
> = (props): JSX.Element => {
  const { children, className, ...rest } = props
  const cls = css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40vh',
    color: 'var(--nw-color-gray-100)',
    backgroundColor: 'white'
  })
  const classes = className ? `${cls} ${className}` : cls
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
export const AbsoluteFullEditLogo: FC = () => {
  return (
    <AbsoluteFull>
      <MdEditNote />
    </AbsoluteFull>
  )
}
export const AbsoluteFullNoteLogo: FC<
  React.HTMLAttributes<HTMLDivElement>
> = props => {
  return (
    <AbsoluteFull {...props}>
      <MdOutlineEventNote />
    </AbsoluteFull>
  )
}
