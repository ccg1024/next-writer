import React, { FC } from 'react'

type NativeDivProps = React.HTMLAttributes<HTMLDivElement>
const Dividing: FC<NativeDivProps> = (props): JSX.Element => {
  const { className, ...rest } = props
  const classes = `dividing-main ${className ?? ''}`
  return (
    <div className={classes} {...rest}>
      <hr className="dividing-content" />
    </div>
  )
}

export default Dividing
