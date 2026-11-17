import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Turns every fenced code block into a `<CodeBlock lang meta code />` element.
 *
 * MDX normally drops the "meta" part of a fence (```js starter), so components like
 * <Playground> and <Exercise> could not tell their code blocks apart. With this plugin,
 * lesson authors write plain fenced code and components read `lang`, `meta` and `code`.
 */
export function remarkCodeBlocks() {
  return (tree: Root) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const element = {
        type: 'mdxJsxFlowElement',
        name: 'CodeBlock',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'lang', value: node.lang ?? '' },
          { type: 'mdxJsxAttribute', name: 'meta', value: node.meta ?? '' },
          { type: 'mdxJsxAttribute', name: 'code', value: node.value },
        ],
        children: [],
      };
      parent.children[index] = element as unknown as RootContent;
    });
  };
}
