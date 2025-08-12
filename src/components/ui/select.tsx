import React from 'react'
type Option = { value:string; label:string }
export const Select: React.FC<{value:string; onValueChange:(v:string)=>void; options?:Option[]; children?:React.ReactNode}> = ({value,onValueChange,children}) => {
  return <select value={value} onChange={(e)=>onValueChange(e.target.value)} style={{width:'100%', padding:'8px 10px', border:'1px solid #d6dbe3', borderRadius:10, fontSize:14}}>{children}</select>
}
export const SelectTrigger: React.FC<{children?:React.ReactNode}> = ({children}) => <>{children}</>
export const SelectValue: React.FC<{placeholder?:string}> = ({placeholder}) => <>{placeholder}</>
export const SelectContent: React.FC<{children?:React.ReactNode}> = ({children}) => <>{children}</>
export const SelectItem: React.FC<{value:string; children?:React.ReactNode}> = ({value,children}) => <option value={value}>{children}</option>
export default Select
