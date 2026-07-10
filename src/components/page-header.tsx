interface PageHeaderProps {
  title: string
  subtitle?: string
  cta?: React.ReactNode
}

function PageHeader({ title, subtitle, cta }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-3xl font-bold leading-[38px] text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {cta && <div className="flex items-center gap-3">{cta}</div>}
    </div>
  )
}

export { PageHeader }
