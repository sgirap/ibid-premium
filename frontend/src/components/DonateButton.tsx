const DONATE_URL = 'https://ko-fi.com/'

export function DonateButton() {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-medium text-amber-950 shadow-sm transition-colors hover:bg-amber-300"
    >
      ☕ Buy me a coffee
    </a>
  )
}
