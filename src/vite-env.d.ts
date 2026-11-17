/// <reference types="vite/client" />

declare module 'virtual:lesson-meta' {
  import type { LessonMeta } from '@/content/types';
  const lessons: LessonMeta[];
  export default lessons;
}

declare module 'virtual:search-docs' {
  import type { SearchDoc } from '@/content/types';
  const docs: SearchDoc[];
  export default docs;
}

declare module 'virtual:reference' {
  import type { ReferenceData } from '@/content/reference/parse';
  const reference: ReferenceData;
  export default reference;
}
