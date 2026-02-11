import { Github } from "lucide-react"

export default function GithubLink() {
  return (
    <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]">
      <a
        href="https://github.com/Rehfeldinio"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-6 py-3 rounded-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm text-neutral-300 hover:text-white hover:border-neutral-600 transition-all duration-300 group"
      >
        <Github className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
        <span className="text-sm font-medium tracking-wide">Rehfeldinio</span>
      </a>
    </footer>
  )
}
