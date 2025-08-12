import React from 'react'
export const Card: React.FC<{className?:string; children?:React.ReactNode}> = ({className='', children}) => <div className={`card ${className}`}><div className="pad">{children}</div></div>
export const CardHeader: React.FC<{className?:string; children?:React.ReactNode}> = ({children}) => <div style={{paddingBottom:8}}>{children}</div>
export const CardTitle: React.FC<{className?:string; children?:React.ReactNode}> = ({children}) => <div style={{fontSize:18, fontWeight:700}}>{children}</div>
export const CardContent: React.FC<{className?:string; children?:React.ReactNode}> = ({children}) => <div className="grid">{children}</div>
