'use client';

import { useMemo, useState } from 'react';
import {
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  Disc3,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSermonPlayer, formatTime, type SermonTrack } from './SermonPlayerContext';

interface SermonPlayerProps {
  sermons: SermonTrack[];
  isLoading?: boolean;
}

export function SermonPlayer({ sermons, isLoading }: SermonPlayerProps) {
  const { current, isPlaying, progress, duration, volume, play, toggle, next, prev, seek, setVolume, setQueue } =
    useSermonPlayer();
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<string | 'all'>('all');

  const playable = useMemo(() => sermons.filter((s) => s.audioUrl), [sermons]);

  const seriesList = useMemo(() => {
    const set = new Set(playable.map((s) => s.seriesName || 'Standalone'));
    return ['all', ...Array.from(set)];
  }, [playable]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return playable.filter((s) => {
      const series = s.seriesName || 'Standalone';
      if (seriesFilter !== 'all' && series !== seriesFilter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.speaker?.toLowerCase().includes(q) ?? false) ||
        series.toLowerCase().includes(q)
      );
    });
  }, [playable, search, seriesFilter]);

  const featured = filtered[0] ?? playable[0];

  const startPlaylist = (tracks: SermonTrack[], track: SermonTrack) => {
    setQueue(tracks);
    play(track, tracks);
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl bg-[#0d1117] text-[#f0f3f6] shadow-elevated">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 border-b border-white/10 p-4 lg:w-56 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1db954]">
              <Disc3 className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold tracking-tight">Spirify</p>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Sermon player</p>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md bg-white/10 px-3 py-2 font-medium"
            >
              <ListMusic className="h-4 w-4 text-[#1db954]" />
              Sermon library
            </button>
          </nav>
          <p className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Series</p>
          <div className="flex flex-wrap gap-1 lg:flex-col">
            {seriesList.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeriesFilter(s)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-left text-xs transition-colors lg:rounded-md lg:px-3 lg:py-1.5',
                  seriesFilter === s ? 'bg-[#1db954]/20 text-[#1db954]' : 'text-white/60 hover:bg-white/5 hover:text-white',
                )}
              >
                {s === 'all' ? 'All sermons' : s}
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-white/10 p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                placeholder="Search sermons, speakers, series…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border-0 bg-white/10 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1db954]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center p-12 text-white/50">Loading sermon library…</div>
          ) : playable.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-12 text-center text-white/50">
              No audio sermons yet. Add sermons with audio URLs in Communications.
            </div>
          ) : (
            <>
              {featured && (
                <div
                  className="relative mx-4 mt-4 overflow-hidden rounded-xl bg-gradient-to-br from-[#1a3d2e] via-[#0d2818] to-[#0d1117] p-6 md:p-8"
                  style={{
                    backgroundImage: featured
                      ? 'linear-gradient(180deg, rgba(29,185,84,0.25) 0%, transparent 60%)'
                      : undefined,
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1db954]">Featured</p>
                  <h2 className="font-heading mt-1 text-2xl font-bold md:text-4xl">{featured.title}</h2>
                  <p className="mt-1 text-sm text-white/70">
                    {featured.speaker ?? 'Guest speaker'}
                    {featured.seriesName ? ` · ${featured.seriesName}` : ''}
                  </p>
                  {featured.description && (
                    <p className="mt-3 max-w-xl text-sm text-white/50 line-clamp-2">{featured.description}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => startPlaylist(filtered.length ? filtered : playable, featured)}
                    className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#1db954] text-black shadow-lg transition-transform hover:scale-105"
                  >
                    <Play className="h-6 w-6 fill-black pl-0.5" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-white/80">All sermons</h3>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                      <th className="pb-2 font-medium w-8">#</th>
                      <th className="pb-2 font-medium">Title</th>
                      <th className="hidden pb-2 font-medium md:table-cell">Series</th>
                      <th className="hidden pb-2 font-medium sm:table-cell">Speaker</th>
                      <th className="pb-2 text-right font-medium w-14">Play</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((track, i) => {
                      const active = current?.id === track.id;
                      return (
                        <tr
                          key={track.id}
                          onClick={() => startPlaylist(filtered, track)}
                          className={cn(
                            'group cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5',
                            active && 'bg-[#1db954]/10',
                          )}
                        >
                          <td className="py-3 text-white/40">{i + 1}</td>
                          <td className="py-3">
                            <p className={cn('font-medium', active && 'text-[#1db954]')}>{track.title}</p>
                            <p className="text-xs text-white/40 md:hidden">{track.speaker ?? '—'}</p>
                          </td>
                          <td className="hidden py-3 text-white/50 md:table-cell">{track.seriesName ?? '—'}</td>
                          <td className="hidden py-3 text-white/50 sm:table-cell">{track.speaker ?? '—'}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startPlaylist(filtered, track);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
                            >
                              {active && isPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4 fill-current" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Now playing bar */}
      <footer className="sticky bottom-0 z-10 border-t border-white/10 bg-[#181818] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#282828]">
              <Disc3 className={cn('h-6 w-6', isPlaying && 'animate-spin text-[#1db954]')} style={{ animationDuration: '4s' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{current?.title ?? 'Select a sermon'}</p>
              <p className="truncate text-xs text-white/50">{current?.speaker ?? 'Church Hub'}</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <button type="button" onClick={prev} className="text-white/70 hover:text-white" aria-label="Previous">
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={toggle}
                disabled={!current?.audioUrl}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-black pl-0.5" />}
              </button>
              <button type="button" onClick={next} className="text-white/70 hover:text-white" aria-label="Next">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
            <div className="flex w-full max-w-md items-center gap-2 text-[10px] text-white/50">
              <span>{formatTime(progress)}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={duration ? (progress / duration) * 100 : 0}
                onChange={(e) => seek(Number(e.target.value) / 100)}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-[#1db954]"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex sm:w-32 sm:justify-end">
            <Volume2 className="h-4 w-4 text-white/50" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-20 accent-[#1db954]"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
