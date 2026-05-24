const variantClass = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const sizeClass = {
  sm: 'min-h-8 px-2.5 text-xs',
  md: 'min-h-10 px-4 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${variantClass[variant] || variantClass.primary} ${sizeClass[size] || sizeClass.md} ${className}`}
      {...props}
    >
      {loading ? <span className="spinner" aria-label="Wird geladen" /> : children}
    </button>
  )
}
