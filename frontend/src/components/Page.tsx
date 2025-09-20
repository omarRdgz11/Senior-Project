type Props = { title?: string; children: React.ReactNode }
export default function Page({ title, children }: Props) {
  return (
    <section className="space-y-4">
      {title && <h1 className="text-3xl font-bold">{title}</h1>}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>
    </section>
  )
}
