import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/** Internal links use the router; external links open in a new tab. */
export function MdxLink({ href = '', className, children, ...props }: ComponentProps<'a'>) {
  const classes = cn(
    'font-medium text-link underline decoration-link/30 underline-offset-4 hover:decoration-link',
    className,
  );
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      {...props}
    >
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
