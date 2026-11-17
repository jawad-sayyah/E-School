// React's type declarations for Monaco, loaded only on TSX lessons (its own chunk).
import reactIndex from '../../node_modules/@types/react/index.d.ts?raw';
import reactGlobal from '../../node_modules/@types/react/global.d.ts?raw';
import reactJsxRuntime from '../../node_modules/@types/react/jsx-runtime.d.ts?raw';

// The real csstype declarations are ~900 KB; React only needs `CSS.Properties`.
const CSSTYPE_STUB = `export interface Properties<TLength = string | 0, TTime = string> {
  [property: string]: string | number | undefined;
}
export interface PropertiesHyphen<TLength = string | 0, TTime = string> extends Properties<TLength, TTime> {}
`;

export const REACT_TYPE_FILES: Record<string, string> = {
  '@types/react/index.d.ts': reactIndex,
  '@types/react/global.d.ts': reactGlobal,
  '@types/react/jsx-runtime.d.ts': reactJsxRuntime,
  'csstype/index.d.ts': CSSTYPE_STUB,
};
