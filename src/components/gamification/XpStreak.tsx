import { Link } from 'react-router';
import { FlameIcon, ZapIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGamification } from '@/gamification/useGamification';
import { cn } from '@/lib/utils';

/** Header pill: streak and level, linking to the progress page. */
export function XpStreak() {
  const { xp, level, streak } = useGamification();
  const label = `Level ${level.level}, ${xp.total} XP. ${streak.current}-day streak${
    streak.current > 0 && !streak.activeToday ? ' (learn today to keep it)' : ''
  }.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/progress"
          aria-label={label}
          className="flex h-9 shrink-0 items-center gap-2.5 rounded-lg border border-border px-2.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span
            className={cn(
              'flex items-center gap-1',
              streak.activeToday
                ? 'text-syn-num'
                : streak.current > 0
                  ? 'text-muted-foreground'
                  : 'text-faint',
            )}
          >
            <FlameIcon
              aria-hidden
              className={cn('size-4', streak.activeToday && 'fill-syn-num/30')}
            />
            {streak.current}
          </span>
          <span className="hidden items-center gap-1 text-js sm:flex">
            <ZapIcon aria-hidden className="size-4 fill-js/30" />
            Lv {level.level}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
