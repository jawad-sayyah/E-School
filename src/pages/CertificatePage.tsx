import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { AwardIcon, LockIcon, PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crumbs } from '@/components/layout/Crumbs';
import { getCourse } from '@/content/courses';
import { getTrack } from '@/content/tracks';
import { trackStatus } from '@/gamification/rules';
import { COURSE_REFS } from '@/gamification/useGamification';
import { useProgress } from '@/progress/ProgressContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import NotFoundPage from './NotFoundPage';

const NAME_KEY = 'eschool-certificate-name';

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

/** A printable certificate for a finished track (a locked preview until it's earned). */
export default function CertificatePage() {
  const { track: trackId } = useParams();
  const track = getTrack(trackId);
  const snapshot = useProgress();
  const hydrated = useHydrated();
  const [typed, setName] = useState<string | null>(null);
  const name = typed ?? (hydrated ? readName() : '');
  useDocumentTitle(track ? `${track.title} certificate` : 'Certificate not found');
  if (!track) return <NotFoundPage />;

  const status = trackStatus(track, COURSE_REFS, snapshot);
  const lastDone = Math.max(
    0,
    ...Object.entries(snapshot.lessons)
      .filter(([key, l]) => l.completed && track.courses.includes(key.split('/')[0]))
      .map(([, l]) => l.completedAt ?? 0),
  );
  // Formatted in the visitor's time zone, so only in the browser (never in the prerendered HTML).
  const date = !hydrated
    ? ''
    : new Date(lastDone).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const saveName = (value: string) => {
    setName(value);
    try {
      localStorage.setItem(NAME_KEY, value);
    } catch {
      /* storage blocked: the name still shows for this visit */
    }
  };

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 pt-10 pb-24 md:px-8">
      <div className="print:hidden">
        <Crumbs
          items={[
            { label: 'Tracks', to: '/tracks' },
            { label: track.title, to: `/tracks/${track.id}` },
            { label: 'Certificate' },
          ]}
        />
        {!status.certified && (
          <p className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            <LockIcon aria-hidden className="size-4 shrink-0" />
            This is a preview. Finish all {status.totalLessons || 'the'} lessons in the track and
            its boss challenge to unlock it.
            {status.totalLessons > 0 && ` You're at ${status.percent}%.`}
          </p>
        )}
        {status.certified && (
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <label className="min-w-60 flex-1 text-sm font-medium">
              Your name on the certificate
              <Input
                value={name}
                onChange={(e) => saveName(e.target.value)}
                placeholder="Your full name"
                className="mt-1.5"
              />
            </label>
            <Button onClick={() => window.print()}>
              <PrinterIcon aria-hidden />
              Print or save as PDF
            </Button>
          </div>
        )}
      </div>

      <section
        aria-label="Certificate"
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 border-js/60 bg-[#12152A] p-10 text-center text-[#F3F1EA] shadow-2xl print:shadow-none md:p-14',
          !status.certified && 'opacity-50 grayscale',
        )}
      >
        <div aria-hidden="true" className="absolute inset-3 rounded-xl border border-js/30" />
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-js text-[#12152A]">
          <AwardIcon aria-hidden className="size-8" />
        </span>
        <p className="text-xs font-semibold tracking-[0.3em] text-[#B9BED3] uppercase">
          E School certificate
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold md:text-4xl">{track.title} track</h1>
        <p className="mt-6 text-[#B9BED3]">This certifies that</p>
        <p className="mt-2 font-heading text-3xl font-semibold text-js">
          {status.certified ? name || 'Your name here' : 'Your name here'}
        </p>
        <p className="mx-auto mt-4 max-w-lg text-[#B9BED3]">
          completed every lesson, exercise and the boss challenge of the {track.title} track:
        </p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {track.courses.map((id) => (
            <li key={id} className="rounded-full border border-[#2A3156] px-3 py-1 text-xs">
              {getCourse(id)?.title}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-[#8A90A8]">{status.certified ? date : 'Not earned yet'}</p>
      </section>

      <p className="mt-6 text-center text-sm print:hidden">
        <Link to={`/tracks/${track.id}`} className="text-link underline underline-offset-4">
          Back to the {track.title} track
        </Link>
      </p>
    </main>
  );
}
