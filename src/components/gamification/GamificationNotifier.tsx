import { useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import { FlameIcon, ZapIcon } from 'lucide-react';
import { useGamification } from '@/gamification/useGamification';
import { useTheme } from '@/theme/ThemeProvider';
import { BADGE_ICONS } from './BadgeIcon';

/**
 * Celebrates new badges, level-ups and streak days with a small toast. Achievements that
 * already existed when the page loaded are never announced.
 */
export function GamificationNotifier() {
  const { theme } = useTheme();
  const { badges, level, streak } = useGamification();
  const streakNow = streak.current;
  const activeToday = streak.activeToday;
  const seen = useRef<{ badges: Set<string>; level: number; streak: number } | null>(null);

  useEffect(() => {
    const earned = badges.filter((b) => b.isEarned);
    if (!seen.current) {
      seen.current = {
        badges: new Set(earned.map((b) => b.id)),
        level: level.level,
        streak: streakNow,
      };
      return;
    }
    const prev = seen.current;
    for (const badge of earned) {
      if (prev.badges.has(badge.id)) continue;
      const Icon = BADGE_ICONS[badge.icon];
      toast(`Badge earned: ${badge.title}`, {
        description: badge.description,
        icon: <Icon aria-hidden className="size-5 text-js" />,
      });
    }
    if (level.level > prev.level) {
      toast(`Level ${level.level}!`, {
        description: 'Keep going: every lesson, exercise and question earns XP.',
        icon: <ZapIcon aria-hidden className="size-5 fill-js/30 text-js" />,
      });
    }
    if (activeToday && streakNow > prev.streak && streakNow > 1) {
      toast(`${streakNow}-day streak`, {
        description: 'You learned something today. See you tomorrow!',
        icon: <FlameIcon aria-hidden className="size-5 text-syn-num" />,
      });
    }
    seen.current = {
      badges: new Set(earned.map((b) => b.id)),
      level: level.level,
      streak: streakNow,
    };
  }, [badges, level.level, streakNow, activeToday]);

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: '!bg-popover !text-popover-foreground !border-border !font-sans',
          description: '!text-muted-foreground',
        },
      }}
    />
  );
}
