import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Check,
  CircleDot,
  Code2,
  FileCode2,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  ScanSearch,
  Terminal,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const steps = [
  ["01", "Connect", "Choose the repository you want to understand.", FolderGit2],
  ["02", "Filter", "Find open issues that are worth investigating.", CircleDot],
  ["03", "Trace", "Follow the issue into docs, structure, and source.", ScanSearch],
  ["04", "Contribute", "Start with a plan you can defend in a pull request.", GitPullRequest],
] as const;

const signals = [
  "Repository structure",
  "Source files",
  "Documentation",
  "Issue history",
];

function Kicker({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-400">{children}</p>;
}

function Line({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-3 border-b border-white/10 py-3 text-sm text-slate-300"><Check className="size-3.5 text-emerald-400" />{children}</div>;
}

function RepoCard() {
  return (
    <div className="relative w-full max-w-[880px] overflow-hidden border border-white/15 bg-[#0e151d] shadow-[12px_12px_0_rgba(16,185,129,0.06)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500"><span>how it works</span><span className="text-slate-600">one repository at a time</span></div>
      <div className="grid md:grid-cols-[0.92fr_1.08fr]">
        <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r md:p-8"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Start with a repository</p><div className="mt-6 flex items-center gap-3 border-b border-white/10 pb-4"><FolderGit2 className="size-5 text-emerald-400" /><span className="font-mono text-sm text-slate-200">github.com/your-project</span></div><p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">Bring the codebase you want to understand. The workspace keeps the investigation focused.</p></div>
        <div className="p-6 md:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Then follow the signal</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { icon: CircleDot, title: "Issues", detail: "find a place to help" },
              { icon: ScanSearch, title: "Context", detail: "see where it lives" },
              { icon: GitPullRequest, title: "Plan", detail: "make the change" },
            ].map((item) => {
              const ItemIcon = item.icon;
              return <div key={item.title} className="border border-white/10 p-4"><ItemIcon className="size-4 text-emerald-400" /><p className="mt-6 text-sm font-medium text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-full overflow-hidden bg-[#0b1016] text-white">
      <section className="relative border-b border-white/10 bg-dot-grid">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(90deg,rgba(11,16,22,0.96),rgba(11,16,22,0.6))]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14 lg:px-12 lg:pb-16 lg:pt-12">
          <div className="flex max-w-xl flex-col justify-center text-left"><h1 className="max-w-4xl font-serif text-[clamp(2.85rem,5vw,4.9rem)] font-normal leading-[0.97] tracking-[-0.06em] text-white">Turn open issues into your <span className="text-emerald-400">next contribution.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">A repository-aware starting point for developers who want to contribute to open source without guessing where the work lives.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="rounded-none bg-emerald-400 px-6 text-[#07110d] hover:bg-emerald-300"><Link href="/repositories">Analyze a repository <ArrowRight className="size-4" /></Link></Button><Button asChild size="lg" variant="outline" className="rounded-none border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="#method">Read the method <ArrowDownRight className="size-4" /></Link></Button></div><div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500"><span className="text-emerald-400">01</span><span>Discover</span><span className="text-slate-700">/</span><span className="text-emerald-400">02</span><span>Understand</span><span className="text-slate-700">/</span><span className="text-emerald-400">03</span><span>Locate</span><span className="text-slate-700">/</span><span className="text-emerald-400">04</span><span>Contribute</span></div></div>
          <div className="flex flex-col justify-center gap-6 lg:pt-8"><div className="max-w-md border-l border-emerald-400/50 pl-5"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">A clearer way in</p><p className="mt-3 text-base leading-7 text-slate-300">Start with the project, not the guess. See the open work, understand the surrounding code, and decide where your contribution can begin.</p></div><RepoCard /></div>
        </div>
        <div className="relative border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600 sm:px-8 lg:px-12"><span>github issue</span><ArrowRight className="size-3" /><span>repository context</span><ArrowRight className="size-3" /><span>relevant code</span><ArrowRight className="size-3" /><span>contribution plan</span></div></div>
      </section>

      <section className="border-b border-white/10 bg-[#0b1016] bg-dot-grid"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:px-12 lg:py-28"><div><Kicker>01 / The starting point</Kicker><h2 className="mt-6 max-w-lg font-serif text-4xl leading-tight tracking-[-0.035em] text-white sm:text-5xl">The issue is only the first layer.</h2></div><div className="grid gap-x-14 gap-y-8 sm:grid-cols-2"><p className="text-base leading-7 text-slate-400">A short GitHub issue can hide a long trail through routes, validation, tests, conventions, and documentation.</p><p className="text-base leading-7 text-slate-400">OpenPath gives you that trail before you decide whether an issue is the right first contribution.</p><div className="sm:col-span-2"><Line>Large codebases with no obvious entry point</Line><Line>Open issues with incomplete technical context</Line><Line>Uncertainty about which files are safe to change</Line></div></div></div></section>

      <section id="method" className="border-b border-white/10 bg-[#101820] bg-dot-grid"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end"><div><Kicker>02 / The method</Kicker><h2 className="mt-6 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.035em] text-white sm:text-5xl">A field guide for your first contribution.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-400">Four deliberate steps. No black-box score pretending to replace your judgment.</p></div><div className="mt-10 grid border-l border-white/10 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([number, label, title, Icon]) => <div key={number} className="border-b border-r border-t border-white/10 p-6 transition-colors hover:bg-white/[0.03] lg:border-b-0"><div className="flex items-center justify-between"><span className="font-mono text-xs text-emerald-400">{number}</span><Icon className="size-4 text-slate-500" /></div><p className="mt-14 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p><h3 className="mt-3 text-lg font-medium leading-6 text-white">{title}</h3></div>)}</div></div></section>

      <section className="border-b border-white/10 bg-[#0b1016] bg-dot-grid"><div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-28"><div><Kicker>03 / Repository-aware guidance</Kicker><h2 className="mt-6 max-w-xl font-serif text-4xl leading-tight tracking-[-0.035em] text-white sm:text-5xl">Useful because it is grounded in the project.</h2><p className="mt-6 max-w-lg text-base leading-7 text-slate-400">The guidance is assembled from the current repository—not from the issue title alone.</p><div className="mt-8 space-y-0">{signals.map((signal) => <div key={signal} className="flex items-center gap-3 border-b border-white/10 py-3 font-mono text-xs text-slate-300"><span className="text-emerald-400">→</span>{signal}</div>)}</div></div><div className="border border-white/15 bg-[#111923] p-6 sm:p-9"><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">context map</span><Terminal className="size-4 text-emerald-400" /></div><div className="mt-8 space-y-2 font-mono text-xs"><div className="border-l-2 border-emerald-400 bg-emerald-400/10 px-4 py-3 text-emerald-200">issue / #545 / validation errors</div><div className="ml-6 border-l border-white/20 px-4 py-3 text-slate-400">↓ repository structure</div><div className="ml-6 border-l-2 border-sky-400 bg-sky-400/10 px-4 py-3 text-sky-200">app/api/streak/route.ts</div><div className="ml-12 border-l border-white/20 px-4 py-3 text-slate-400">↓ validation path</div><div className="ml-12 border-l-2 border-amber-400 bg-amber-400/10 px-4 py-3 text-amber-200">lib/validations.ts</div><div className="mt-5 border-t border-white/10 pt-5 text-slate-300">→ explain the likely path<br />→ suggest the smallest safe change<br />→ define the tests to run</div></div></div></div></section>

      <section className="border-b border-white/10 bg-[#101820] bg-dot-grid"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><Kicker>04 / Forks and upstreams</Kicker><h2 className="mt-6 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.035em] text-white sm:text-5xl">Your fork is a window into the upstream project.</h2><p className="mt-6 max-w-xl text-base leading-7 text-slate-400">Import the repository you work from and surface upstream issues that can become your next contribution.</p></div><Button asChild size="lg" className="rounded-none bg-emerald-400 text-[#07110d] hover:bg-emerald-300"><Link href="/repositories">Open the workspace <ArrowRight className="size-4" /></Link></Button></div><div className="mt-12 grid border-y border-white/10 sm:grid-cols-4">{["your fork", "upstream", "open issues", "guided plan"].map((item, index) => <div key={item} className="flex items-center gap-4 border-b border-white/10 px-4 py-5 font-mono text-xs uppercase tracking-[0.16em] text-slate-300 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-emerald-400">0{index + 1}</span>{item}</div>)}</div></div></section>

      <section className="bg-[#0b1016] bg-dot-grid"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="border-l-2 border-emerald-400 pl-6 sm:pl-10"><Kicker>Begin with one issue</Kicker><h2 className="mt-6 max-w-3xl font-serif text-5xl leading-[0.98] tracking-[-0.05em] text-white sm:text-7xl">Find the part of the project where you can help.</h2><p className="mt-7 max-w-xl text-base leading-7 text-slate-400">OpenPath helps you discover, understand, locate, plan, and contribute—without pretending to code for you.</p><div className="mt-9"><Button asChild size="lg" className="rounded-none bg-emerald-400 px-6 text-[#07110d] hover:bg-emerald-300"><Link href="/repositories">Analyze a repository <ArrowRight className="size-4" /></Link></Button></div></div><div className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600"><span>OpenPath</span><span>built for responsible contribution</span></div></div></section>
    </div>
  );
}
