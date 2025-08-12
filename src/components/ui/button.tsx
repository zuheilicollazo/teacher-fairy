import React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'secondary'|'outline'; size?: 'sm'|'md'|'lg' }
export const Button: React.FC<Props> = ({ variant='default', size='md', className='', ...rest }) => {
  const base = 'inline-flex items-center justify-center rounded-lg border transition-colors'
  const v = variant==='secondary' ? 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
    : variant==='outline' ? 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
    : 'bg-gray-900 border-gray-900 text-white hover:bg-black'
  const s = size==='sm' ? 'px-2.5 py-1.5 text-sm' : size==='lg' ? 'px-4 py-2 text-base' : 'px-3 py-2 text-sm'
  return <button className={`${base} ${v} ${s} ${className}`} {...rest} />
}
export default Button
