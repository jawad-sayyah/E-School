// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { BASE_PACKAGES, dependenciesFor, importedPackages, packageName } from './packages';

describe('sandbox packages', () => {
  test('package names from import specifiers', () => {
    expect(packageName('react-dom/client')).toBe('react-dom');
    expect(packageName('@tanstack/react-query')).toBe('@tanstack/react-query');
    expect(packageName('@hookform/resolvers/zod')).toBe('@hookform/resolvers');
  });

  test('finds bare imports, ignores relative ones', () => {
    const code = [
      'import { useState } from "react";',
      "import { create } from 'zustand';",
      'import App from "./App";',
      'import "./styles.css";',
      'const Chart = lazy(() => import("./Chart"));',
      'import { zodResolver } from "@hookform/resolvers/zod";',
    ].join('\n');
    expect(importedPackages(code).sort()).toEqual(['@hookform/resolvers', 'react', 'zustand']);
  });

  test('adds only the optional packages a sandbox imports', () => {
    const deps = dependenciesFor({
      '/App.js': 'import { create } from "zustand";\nimport { useState } from "react";',
    });
    expect(deps).toMatchObject(BASE_PACKAGES);
    expect(Object.keys(deps)).toContain('zustand');
    expect(Object.keys(deps)).not.toContain('react-redux');
  });
});
