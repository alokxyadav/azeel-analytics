/** One labelled row in a settings-style list: description on the left, controls on the right. */
export function SettingsRow({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-8">
      <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm text-text-muted">{desc}</p></div>
      <div>{children}</div>
    </div>
  );
}
