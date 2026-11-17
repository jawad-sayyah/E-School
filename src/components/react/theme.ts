import type { SandpackTheme } from '@codesandbox/sandpack-react';

/** Sandpack in the E School editor colors (editors stay dark in both themes). */
export const sandpackTheme: SandpackTheme = {
  colors: {
    surface1: '#1c2140',
    surface2: '#151933',
    surface3: '#262c52',
    clickable: '#a9aecb',
    base: '#e9e7f0',
    disabled: '#5a6185',
    hover: '#f3f1ea',
    accent: '#82aaff',
    error: '#ff8a80',
    errorSurface: '#3a1f2a',
  },
  syntax: {
    plain: '#e9e7f0',
    comment: { color: '#7f86a8', fontStyle: 'italic' },
    keyword: '#c792ea',
    tag: '#f07178',
    punctuation: '#89ddff',
    definition: '#82aaff',
    property: '#89ddff',
    static: '#f78c6c',
    string: '#c3e88d',
  },
  font: {
    body: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono Variable", ui-monospace, monospace',
    size: '13.5px',
    lineHeight: '22px',
  },
};
