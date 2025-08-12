import React from 'react'
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
  return <label {...props} style={{fontWeight:600, fontSize:12, color:'#4b5563', display:'block', marginBottom:4}} />
}
export default Label
