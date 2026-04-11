import { type CSSProperties, memo, useMemo } from 'react'
import DOMPurify from 'dompurify'

export const HtmlContent = memo(function HtmlContent({
  html,
  className,
  style,
}: {
  html: string
  className?: string
  style?: CSSProperties
}) {
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html])

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
})
