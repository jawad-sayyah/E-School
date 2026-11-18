import {
  ArrowDownUpIcon,
  BugIcon,
  FlaskConicalIcon,
  CircleHelpIcon,
  Code2Icon,
  FootprintsIcon,
  GitPullRequestIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  Link2Icon,
  ListChecksIcon,
  PencilLineIcon,
  TerminalIcon,
  TextCursorInputIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react';

/** Every question type in the school. Content tests require 3+ different kinds per lesson. */
export type QuestionKind =
  | 'choice'
  | 'predict'
  | 'blanks'
  | 'order'
  | 'match'
  | 'buckets'
  | 'spot-bug'
  | 'fix-bug'
  | 'write-code'
  | 'trace'
  | 'code-review'
  | 'true-false'
  | 'build-ui'
  | 'write-tests';

export const QUESTION_KINDS: Record<QuestionKind, { label: string; icon: LucideIcon }> = {
  choice: { label: 'Multiple choice', icon: ListChecksIcon },
  predict: { label: 'Predict the output', icon: TerminalIcon },
  blanks: { label: 'Fill in the blanks', icon: TextCursorInputIcon },
  order: { label: 'Order the lines', icon: ArrowDownUpIcon },
  match: { label: 'Match the pairs', icon: Link2Icon },
  buckets: { label: 'Sort into buckets', icon: LayoutGridIcon },
  'spot-bug': { label: 'Spot the bug', icon: BugIcon },
  'fix-bug': { label: 'Fix the bug', icon: WrenchIcon },
  'write-code': { label: 'Write the code', icon: PencilLineIcon },
  trace: { label: 'Trace the state', icon: FootprintsIcon },
  'code-review': { label: 'Code review', icon: GitPullRequestIcon },
  'true-false': { label: 'True or false', icon: CircleHelpIcon },
  'build-ui': { label: 'Build the UI', icon: LayoutTemplateIcon },
  'write-tests': { label: 'Write the tests', icon: FlaskConicalIcon },
};

/** MDX component name → question kind (used by content tests to count kinds per lesson). */
export const COMPONENT_KINDS: Record<string, QuestionKind | 'quiz'> = {
  Quiz: 'quiz',
  Choice: 'choice',
  Predict: 'predict',
  FillBlanks: 'blanks',
  OrderLines: 'order',
  MatchPairs: 'match',
  SortBuckets: 'buckets',
  SpotTheBug: 'spot-bug',
  TraceState: 'trace',
  CodeReview: 'code-review',
  TrueFalse: 'true-false',
  Exercise: 'write-code',
  ReactExercise: 'write-code',
  BuildUI: 'build-ui',
  ProjectStep: 'write-code',
  TSExercise: 'write-code',
  TestExercise: 'write-tests',
  ReactTestExercise: 'write-tests',
};

export const CODE_ICON = Code2Icon;
