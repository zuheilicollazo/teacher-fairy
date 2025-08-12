import React from 'react'
export const Checkbox: React.FC<{id?:string; checked?:boolean; onCheckedChange?: (v:boolean)=>void}> = ({id, checked, onCheckedChange}) => {
  return <input id={id} type="checkbox" checked={!!checked} onChange={(e)=>onCheckedChange?.(e.target.checked)} />
}
export default Checkbox
