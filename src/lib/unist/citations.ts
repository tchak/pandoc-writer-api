import { Plugin, Settings } from 'unified';
import { MdastNode } from './types';

function isRemarkParser(parser) {
  return Boolean(
    parser && parser.prototype && parser.prototype.blockTokenizers
  );
}

function isRemarkCompiler(compiler) {
  return Boolean(compiler && compiler.prototype && compiler.prototype.visitors);
}

function attachCompiler(compiler) {
  const serializers = compiler.prototype.visitors;

  function citation(node: MdastNode) {
    const items: string[] = [];

    for (const item of node.citationItems) {
      if (item.authorOnly) {
        return `@${item.id}`;
      }
      const prefix = item.prefix ? `${item.prefix} ` : '';
      const id = `${item.suppressAuthor ? '-' : ''}@${item.id}`;
      const locator = item.locator ? ` ${item.locator}` : '';
      items.push(`${prefix}${id}${locator}`);
    }

    return `[${items.join(';')}]`;
  }

  serializers.citation = citation;
}

export const citations: Plugin = function (options: Settings): void {
  //const parser = this.Parser;
  const compiler = this.Compiler;

  // if (isRemarkParser(parser)) {
  //   attachParser(parser, options);
  // }

  if (isRemarkCompiler(compiler)) {
    attachCompiler(compiler);
  }
};
