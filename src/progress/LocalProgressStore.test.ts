import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalProgressStore, PROGRESS_STORAGE_KEY } from './LocalProgressStore';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
});

describe('LocalProgressStore', () => {
  test('starts empty', () => {
    const store = new LocalProgressStore(storage);
    expect(store.getLesson('js-basics', 'variables')).toEqual({ completed: false });
    expect(store.getCourseProgress('js-basics', ['a', 'b'])).toEqual({
      completed: 0,
      total: 2,
      percent: 0,
    });
  });

  test('marks lessons complete and persists them', async () => {
    const store = new LocalProgressStore(storage, PROGRESS_STORAGE_KEY, () => 1000);
    await store.markComplete('js-basics', 'variables');
    expect(store.getLesson('js-basics', 'variables')).toMatchObject({
      completed: true,
      completedAt: 1000,
    });
    expect(store.getCourseProgress('js-basics', ['variables', 'loops'])).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
    });
    const reloaded = new LocalProgressStore(storage);
    expect(reloaded.getLesson('js-basics', 'variables').completed).toBe(true);
  });

  test('can un-complete a lesson', async () => {
    const store = new LocalProgressStore(storage);
    await store.markComplete('js-basics', 'loops');
    await store.markComplete('js-basics', 'loops', false);
    expect(store.getLesson('js-basics', 'loops').completed).toBe(false);
  });

  test('remembers the last visited lesson without losing completion', async () => {
    const store = new LocalProgressStore(storage, PROGRESS_STORAGE_KEY, () => 5);
    await store.markComplete('js-basics', 'loops');
    await store.markVisited('js-basics', 'loops');
    expect(store.getSnapshot().lastVisited).toEqual({
      course: 'js-basics',
      lesson: 'loops',
      at: 5,
    });
    expect(store.getLesson('js-basics', 'loops').completed).toBe(true);
  });

  test('keeps only the best quiz score', async () => {
    const store = new LocalProgressStore(storage);
    await store.saveQuizScore('js-basics/loops', 3, 4);
    await store.saveQuizScore('js-basics/loops', 2, 4);
    expect(store.getSnapshot().quizzes['js-basics/loops']).toMatchObject({ best: 3, total: 4 });
    await store.saveQuizScore('js-basics/loops', 4, 4);
    expect(store.getSnapshot().quizzes['js-basics/loops'].best).toBe(4);
  });

  test('a passed exercise stays passed', async () => {
    const store = new LocalProgressStore(storage);
    await store.saveExerciseResult('js-basics/arrays/get-total', true);
    await store.saveExerciseResult('js-basics/arrays/get-total', false);
    expect(store.getSnapshot().exercises['js-basics/arrays/get-total'].passed).toBe(true);
  });

  test('notifies subscribers and gives a new snapshot object on change', async () => {
    const store = new LocalProgressStore(storage);
    const listener = vi.fn();
    const before = store.getSnapshot();
    const unsubscribe = store.subscribe(listener);
    await store.markComplete('c', 'l');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    unsubscribe();
    await store.markComplete('c', 'm');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('reset clears everything', async () => {
    const store = new LocalProgressStore(storage);
    await store.markComplete('c', 'l');
    await store.reset();
    expect(store.getLesson('c', 'l').completed).toBe(false);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  test('ignores corrupted storage', () => {
    storage.setItem(PROGRESS_STORAGE_KEY, '{not json');
    expect(new LocalProgressStore(storage).getSnapshot().lessons).toEqual({});
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 99, lessons: 'x' }));
    expect(new LocalProgressStore(storage).getSnapshot().lessons).toEqual({});
  });

  test('works when storage throws', async () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    const store = new LocalProgressStore(broken);
    await store.markComplete('c', 'l');
    expect(store.getLesson('c', 'l').completed).toBe(true);
    await expect(store.reset()).resolves.toBeUndefined();
  });

  test('works with no storage at all', async () => {
    const store = new LocalProgressStore(null);
    await store.markComplete('c', 'l');
    expect(store.getLesson('c', 'l').completed).toBe(true);
  });
});

describe('question results and activity', () => {
  test('saves a question result and keeps a correct answer', async () => {
    const store = new LocalProgressStore(storage, PROGRESS_STORAGE_KEY, () => 1000);
    await store.saveQuestionResult('c/l/q1', { correct: true, attempts: 2, kind: 'predict' });
    await store.saveQuestionResult('c/l/q1', { correct: false, attempts: 1, revealed: true });
    expect(store.getSnapshot().questions['c/l/q1']).toEqual({
      correct: true,
      attempts: 2,
      revealed: false,
      kind: 'predict',
      at: 1000,
    });
  });

  test('a revealed answer is recorded as not correct', async () => {
    const store = new LocalProgressStore(storage);
    await store.saveQuestionResult('q', { correct: false, attempts: 3, revealed: true });
    expect(store.getSnapshot().questions.q).toMatchObject({ correct: false, revealed: true });
  });

  test('learning actions record the day once, visits do not', async () => {
    let now = new Date(2026, 10, 16, 10).getTime();
    const store = new LocalProgressStore(storage, PROGRESS_STORAGE_KEY, () => now);
    await store.markVisited('c', 'l');
    expect(store.getSnapshot().activity).toEqual([]);
    await store.markComplete('c', 'l');
    await store.saveQuestionResult('q', { correct: true, attempts: 1 });
    expect(store.getSnapshot().activity).toEqual(['2026-11-16']);
    now = new Date(2026, 10, 17, 9).getTime();
    await store.saveExerciseResult('e', true);
    expect(store.getSnapshot().activity).toEqual(['2026-11-16', '2026-11-17']);
  });

  test('old snapshots without the new fields still load', () => {
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lessons: { 'c/l': { completed: true } },
        quizzes: {},
        exercises: {},
      }),
    );
    const s = new LocalProgressStore(storage).getSnapshot();
    expect(s.questions).toEqual({});
    expect(s.activity).toEqual([]);
    expect(s.lessons['c/l'].completed).toBe(true);
  });
});
