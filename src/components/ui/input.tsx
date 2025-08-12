import React from 'react'
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function I(props, ref){
  return <input ref={ref} {...props} style={{width:'100%', padding:'8px 10px', border:'1px solid #d6dbe3', borderRadius:10, fontSize:14}} />
})
export default Input
