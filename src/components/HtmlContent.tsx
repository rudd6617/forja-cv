import { memo, useMemo } from 'react'
import DOMPurify from 'dompurify'

export const HtmlContent = memo(function HtmlContent({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html])

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
})
