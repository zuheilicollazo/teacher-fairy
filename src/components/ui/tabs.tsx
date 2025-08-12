import React from 'react'
export const Tabs: React.FC<{children?:React.ReactNode; defaultValue?:string; value?:string; onValueChange?:(v:string)=>void}> = ({children}) => <div>{children}</div>
export const TabsList: React.FC<{children?:React.ReactNode}> = ({children}) => <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>{children}</div>
export const TabsTrigger: React.FC<{value:string; children?:React.ReactNode; onClick?:()=>void}> = ({children, onClick}) => <button onClick={onClick} style={{padding:'6px 10px', border:'1px solid #d6dbe3', borderRadius:10, background:'#fff'}}>{children}</button>
export const TabsContent: React.FC<{value:string; children?:React.ReactNode}> = ({children}) => <div style={{marginTop:8}}>{children}</div>
