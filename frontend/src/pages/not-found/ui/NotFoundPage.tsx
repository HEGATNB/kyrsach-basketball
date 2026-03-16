import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';
import { GlowingCard } from '@/shared/ui/GlowingCard';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <GlowingCard glowColor="purple" className="max-w-3xl p-8 text-center md:p-12">
        <div className="brand-mark mx-auto flex h-20 w-20 items-center justify-center rounded-[28px]">
          <Compass className="h-10 w-10 text-white" />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.34em] text-slate-400">404 • route missing</p>
        <h1 className="mt-4 font-spacegrotesk text-5xl font-bold text-white sm:text-6xl">This page is off the board.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300">
          The route you requested is not available in the current build. Head back to the dashboard or jump into the
          scouting sections that are already connected to the live stack.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="btn-primary"
          >
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
          <Link
            to="/teams"
            className="btn-secondary"
          >
            <Search className="h-4 w-4" />
            Explore teams
          </Link>
        </div>
      </GlowingCard>
    </div>
  );
}
