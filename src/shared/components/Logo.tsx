interface LogoProps {
  /** Height in px. Width auto-scales to maintain the lockup's aspect ratio. */
  height?: number
  className?: string
  /** Hide for decorative use; provide for standalone brand display. */
  alt?: string
}

export default function Logo({ height = 40, className = '', alt = 'MaidEzy' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      style={{ height }}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  )
}
