import MiniSearch from 'minisearch';
import { COURSES } from '@/content/courses';
import { REFERENCE_COURSE, REFERENCE_TITLE, type SearchDoc } from '@/content/types';

export interface SearchHit {
  id: string;
  kind: SearchDoc['kind'];
  course: string;
  lesson: string;
  lessonTitle: string;
  title: string;
  anchor?: string;
  url: string;
  score: number;
}

export interface SearchGroup {
  course: string;
  courseTitle: string;
  hits: SearchHit[];
}

const STORE = ['kind', 'course', 'lesson', 'lessonTitle', 'title', 'anchor'] as const;

export function createSearchIndex(docs: SearchDoc[]) {
  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'tags', 'text', 'code'],
    storeFields: [...STORE],
    searchOptions: {
      boost: { title: 5, tags: 2, text: 1, code: 1 },
      prefix: true,
      fuzzy: 0.15,
      combineWith: 'AND',
    },
  });
  index.addAll(docs);
  return index;
}

export function urlFor(doc: Pick<SearchDoc, 'course' | 'lesson' | 'anchor'>) {
  if (doc.course === REFERENCE_COURSE) return `/reference${doc.anchor ? `#${doc.anchor}` : ''}`;
  return `/courses/${doc.course}/${doc.lesson}${doc.anchor ? `#${doc.anchor}` : ''}`;
}

/** Searches and groups the hits by course, in course order (the reference comes last). */
export function searchGrouped(
  index: MiniSearch<SearchDoc>,
  query: string,
  limit = 24,
): SearchGroup[] {
  const q = query.trim();
  if (!q) return [];
  const hits: SearchHit[] = index
    .search(q)
    .slice(0, limit)
    .map((r) => {
      const doc = r as unknown as SearchDoc & { score: number };
      return {
        id: String(r.id),
        kind: doc.kind,
        course: doc.course,
        lesson: doc.lesson,
        lessonTitle: doc.lessonTitle,
        title: doc.title,
        anchor: doc.anchor,
        url: urlFor(doc),
        score: r.score,
      };
    });
  const groups = [
    ...COURSES.map((c) => ({ course: c.id, courseTitle: c.title })),
    { course: REFERENCE_COURSE, courseTitle: REFERENCE_TITLE },
  ];
  return groups
    .map((g) => ({ ...g, hits: hits.filter((h) => h.course === g.course) }))
    .filter((g) => g.hits.length > 0);
}
