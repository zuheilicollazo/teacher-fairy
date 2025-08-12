import React from 'react'
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  return <textarea {...props} style={{width:'100%', minHeight:96, padding:'8px 10px', border:'1px solid #d6dbe3', borderRadius:10, fontSize:14}} />
}
export default Textarea
