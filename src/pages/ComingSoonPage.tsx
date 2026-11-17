import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Crumbs } from '@/components/layout/Crumbs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface ComingSoonProps {
  title: string;
  phase: number;
  description: string;
}

function ComingSoon({ title, phase, description }: ComingSoonProps) {
  useDocumentTitle(title);
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: title }]} />
      <h1 className="mb-3 font-heading text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mb-8 text-lg text-muted-foreground">{description}</p>
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="mb-4 text-muted-foreground">This page arrives in phase {phase}.</p>
        <Button asChild variant="outline">
          <Link to="/courses/js-basics">Continue with JavaScript Basics</Link>
        </Button>
      </div>
    </main>
  );
}

export function ProjectPage() {
  return (
    <ComingSoon
      title="Build MiniShop"
      phase={6}
      description="The final project: build the shopping cart as a full React and TypeScript app, step by step, and test it."
    />
  );
}

export function ReferencePage() {
  return (
    <ComingSoon
      title="JavaScript Quick Reference"
      phase={2}
      description="Every JavaScript concept in one sentence, with code you can edit and run."
    />
  );
}
