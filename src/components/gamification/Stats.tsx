import { motion, useReducedMotion } from 'motion/react';
import { AwardIcon, FlameIcon, LockIcon, ZapIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/gamification/useGamification';
import { cn } from '@/lib/utils';
import { BADGE_ICONS } from './BadgeIcon';

/** Level, XP, streak and badge count in four tiles. */
export function StatsRow() {
  const { xp, level, streak, badges } = useGamification();
  const earned = badges.filter((b) => b.isEarned).length;
  const tiles = [
    {
      label: 'Level',
      value: level.level,
      sub: `${xp.total - level.floor} / ${level.next - level.floor} XP to level ${level.level + 1}`,
      icon: <ZapIcon aria-hidden className="size-4 fill-js/30 text-js" />,
      bar: level.progress * 100,
    },
    {
      label: 'Total XP',
      value: xp.total,
      sub: 'From lessons, exercises and questions',
      icon: <ZapIcon aria-hidden className="size-4 text-js" />,
    },
    {
      label: 'Streak',
      value: `${streak.current} day${streak.current === 1 ? '' : 's'}`,
      sub: streak.activeToday
        ? `Done for today · best ${streak.longest}`
        : streak.current > 0
          ? 'Learn something today to keep it'
          : 'Learn today to start one',
      icon: <FlameIcon aria-hidden className="size-4 text-syn-num" />,
    },
    {
      label: 'Badges',
      value: `${earned} / ${badges.length}`,
      sub: 'Milestones and finished courses',
      icon: <AwardIcon aria-hidden className="size-4 text-react" />,
    },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="gap-1 px-4 py-4">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-faint">
            {t.icon}
            {t.label}
          </dt>
          <dd className="font-heading text-2xl font-bold">{t.value}</dd>
          <dd className="text-xs text-muted-foreground">{t.sub}</dd>
          {t.bar !== undefined && (
            <dd>
              <Progress
                value={t.bar}
                indicatorClassName="bg-js"
                className="mt-1.5"
                aria-label="Progress to the next level"
              />
            </dd>
          )}
        </Card>
      ))}
    </dl>
  );
}

/** Every badge: earned ones in color, locked ones dimmed with their requirement. */
export function BadgeGrid() {
  const { badges } = useGamification();
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((b, i) => {
        const Icon = BADGE_ICONS[b.icon];
        return (
          <motion.li
            key={b.id}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-border p-3',
              b.isEarned ? 'bg-card' : 'opacity-60',
            )}
          >
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full',
                b.isEarned ? 'bg-js text-on-light' : 'bg-muted text-faint',
              )}
            >
              {b.isEarned ? (
                <Icon aria-hidden className="size-5" />
              ) : (
                <LockIcon aria-hidden className="size-4" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{b.title}</span>
              <span className="block text-xs text-muted-foreground">{b.description}</span>
              <span className="sr-only">{b.isEarned ? '(earned)' : '(not earned yet)'}</span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
