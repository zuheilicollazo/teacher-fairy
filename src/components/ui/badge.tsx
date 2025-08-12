import React from 'react'
export const Badge: React.FC<{variant?:'default'|'outline'; className?:string; onClick?:()=>void; children?:React.ReactNode}> = ({variant='default', className='', onClick, children}) => {
  const cls = `badge ${variant==='default'?'on':''} ${className||''}`
  return <span onClick={onClick} className={cls}>{children}</span>
}
export default Badge
