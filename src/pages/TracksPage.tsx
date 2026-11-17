import { Crumbs } from '@/components/layout/Crumbs';
import { TrackCard } from '@/components/TrackCard';
import { TRACKS } from '@/content/tracks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function TracksPage() {
  useDocumentTitle('Tracks');
  return (
    <main id="main" className="mx-auto max-w-6xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: 'Tracks' }]} />
      <h1 className="mb-3 font-heading text-4xl font-bold tracking-tight">Tracks</h1>
      <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
        Four paths through the school. Each track ends with a boss challenge and a certificate.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {TRACKS.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </div>
    </main>
  );
}
