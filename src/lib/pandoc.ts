import { diffLines } from 'diff';
import htmldiff from 'node-htmldiff';
import { JSDOM } from 'jsdom';
import * as sh from 'nodejs-sh';
import path from 'path';
import wordwrap from 'wordwrap';

export interface Options {
  files?: string[];
  threshold?: number;
  output?: string;
  to?: string;
  from?: string;
  filter?: string;
  wrap?: number;
  standalone?: boolean;
}

const forEachR = (a, f) => {
  for (let i = a.length - 1; i >= 0; i--) f(a[i]);
};
const removeNode = (node) => node.parentNode.removeChild(node);
const removeNodes = (nodes) => forEachR(nodes, removeNode);

function diffu(text1, text2) {
  const result = [];
  diffLines(text1, text2).forEach((part) => {
    let prefix = ' ';
    if (part.removed) prefix = '-';
    if (part.added) prefix = '+';
    let chunk = part.value;
    if (chunk[chunk.length - 1] === '\n') chunk = chunk.slice(0, -1);
    for (const line of chunk.split('\n')) result.push(prefix + line);
  });
  return result.join('\n');
}

function postprocess(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // handle math
  forEachR(document.querySelectorAll('span.math.inline'), (math) => {
    math.innerHTML = '\\(' + math.innerHTML + '\\)';
  });
  forEachR(document.querySelectorAll('span.math.display'), (math) => {
    math.innerHTML = '\\[' + math.innerHTML + '\\]';
  });
  forEachR(document.querySelectorAll('span.math'), (math) => {
    const post = math.cloneNode(true);
    removeNodes(math.getElementsByTagName('ins'));
    removeNodes(post.getElementsByTagName('del'));
    math.textContent = math.textContent;
    post.textContent = post.textContent;
    if (math.textContent === post.textContent) return;
    math.innerHTML =
      '<del>' + math.innerHTML + '</del><ins>' + post.innerHTML + '</ins>';
  });

  // strip any pre-existing spans or divs
  for (let span; (span = document.querySelector('span,div,section')); ) {
    if (['insertion', 'deletion'].includes(span.className)) {
      const tag = span.className.slice(0, 3);
      span.outerHTML = `<${tag}>${span.innerHTML}</${tag}>`;
    } else {
      span.outerHTML = span.innerHTML;
    }
  }

  // fix figures with modified images
  forEachR(document.getElementsByTagName('figure'), (figure) => {
    const imgs = figure.getElementsByTagName('img');
    if (imgs.length > 1) {
      const after = figure.cloneNode(true);
      removeNodes(figure.getElementsByTagName('ins'));
      removeNodes(after.getElementsByTagName('del'));
      figure.outerHTML =
        '<div class="del">' +
        figure.outerHTML +
        '</div><div class="ins">' +
        after.outerHTML +
        '</div>';
    }
  });

  // compact lists
  forEachR(document.querySelectorAll('li>p:only-child'), (par) => {
    par.outerHTML = par.innerHTML;
  });

  // redundant title attributes
  forEachR(document.getElementsByTagName('img'), (image) => {
    if (image.title && image.title === image.alt)
      image.removeAttribute('title');
  });

  // line by line diff of code blocks
  forEachR(document.getElementsByTagName('pre'), (pre) => {
    const post = pre.cloneNode(true);
    removeNodes(pre.getElementsByTagName('ins'));
    removeNodes(post.getElementsByTagName('del'));
    if (pre.textContent === post.textContent) return;
    pre.className = 'diff';
    pre.textContent = diffu(pre.textContent, post.textContent);
  });

  // turn diff tags into spans
  forEachR(document.getElementsByTagName('del'), (del) => {
    del.outerHTML = '<span class="del">' + del.innerHTML + '</span>';
  });
  forEachR(document.getElementsByTagName('ins'), (ins) => {
    ins.outerHTML = '<span class="ins">' + ins.innerHTML + '</span>';
  });

  // pull diff tags outside inline tags when possible
  const inlineTags = new Set(['a', 'code', 'em', 'q', 'strong', 'sub', 'sup']);
  forEachR(document.getElementsByTagName('span'), (span) => {
    const content = span.innerHTML;
    const par = span.parentNode;
    if (
      par &&
      par.childNodes.length === 1 &&
      inlineTags.has(par.tagName.toLowerCase())
    ) {
      par.innerHTML = content;
      par.outerHTML = `<span class="${span.className}">${par.outerHTML}</span>`;
    }
  });

  // merge adjacent diff tags
  forEachR(document.getElementsByTagName('span'), (span) => {
    const next = span.nextSibling;
    if (next && span.className === next.className) {
      span.innerHTML += next.innerHTML;
      removeNode(next);
    }
  });

  // split completely rewritten paragraphs
  forEachR(document.getElementsByTagName('p'), (para) => {
    const ch = para.childNodes;
    if (
      ch.length === 2 &&
      ch[0].className === 'del' &&
      ch[1].className === 'ins'
    ) {
      para.outerHTML =
        '<p>' + ch[0].outerHTML + '</p><p>' + ch[1].outerHTML + '</p>';
    }
  });

  // identify substitutions
  forEachR(document.getElementsByTagName('span'), (span) => {
    const next = span.nextSibling;
    if (next && span.className === 'del' && next.className === 'ins') {
      span.outerHTML =
        '<span class="sub">' + span.outerHTML + next.outerHTML + '</span>';
      removeNode(next);
    }
  });
  return dom.serialize();
}

function buildArgs(opts, ...params) {
  const args = [];
  for (const param of params) {
    if (param in opts) {
      if (typeof opts[param] === 'boolean') {
        if (opts[param] === true) args.push(`--${param}`);
      } else if (Array.isArray(opts[param])) {
        for (const opt of opts[param]) {
          args.push(`--${param}=${opt}`);
        }
      } else {
        args.push(`--${param}=${opts[param]}`);
      }
    }
  }
  return args;
}

async function convert(source: string, opts: Options = {}): Promise<string> {
  const args = buildArgs(
    opts,
    'bibliography',
    'extract-media',
    'filter',
    'from',
    'resource-path'
  );
  args.push('--html-q-tags', '--mathjax');
  let html;
  if (opts.files) {
    html = await sh.pandoc(...args, source).toString();
  } else {
    html = await sh
      .pandoc(...args)
      .end(source)
      .toString();
  }
  html = html.replace(/\\[()[\]]/g, '');
  if ('extract-media' in opts) {
    html = await sh
      .pandoc(...args, '--from=html')
      .end(html)
      .toString();
  }
  return html;
}

const markdown = [
  'markdown',
  '-bracketed_spans',
  '-fenced_code_attributes',
  '-fenced_divs',
  '-grid_tables',
  '-header_attributes',
  '-inline_code_attributes',
  '-link_attributes',
  '-multiline_tables',
  '-pipe_tables',
  '-simple_tables',
  '-smart',
].join('');

const regex = {
  critic: {
    del: /\{--([\s\S]*?)--\}/g,
    ins: /\{\+\+([\s\S]*?)\+\+\}/g,
    sub: /\{~~((?:[^~]|(?:~(?!>)))+)~>((?:[^~]|(?:~(?!~\})))+)~~\}/g,
  },
  span: {
    del: /<span class="del">([\s\S]*?)<\/span>/g,
    ins: /<span class="ins">([\s\S]*?)<\/span>/g,
    sub: /<span class="sub"><span class="del">([\s\S]*?)<\/span><span class="ins">([\s\S]*?)<\/span><\/span>/g,
  },
  div: {
    del: /<div class="del">\s*([\s\S]*?)\s*<\/div>/g,
    ins: /<div class="ins">\s*([\s\S]*?)\s*<\/div>/g,
  },
};

async function render(html: string, opts: Options = {}): Promise<string> {
  html = postprocess(html);

  const args = buildArgs(opts, 'atx-headers', 'reference-links');
  args.push('--wrap=none');
  if (opts.output || opts.to) {
    args.push('--atx-headers');
  }

  let output = await sh
    .pandoc('-f', 'html+tex_math_single_backslash', '-t', markdown)
    .end(html)
    .toString();
  output = await sh
    .pandoc(...args, '-t', markdown)
    .end(output)
    .toString();
  output = output
    .replace(regex.span.sub, '{~~$1~>$2~~}')
    .replace(regex.span.del, '{--$1--}')
    .replace(regex.span.ins, '{++$1++}')
    .replace(regex.div.del, '{--$1--}')
    .replace(regex.div.ins, '{++$1++}');

  const { wrap = 72 } = opts;
  const lines = [];
  let pre = false;
  for (const line of output.split('\n')) {
    const lastLineLen = lines.length > 0 ? lines[lines.length - 1].length : 0;
    if (line.startsWith('```')) {
      pre = !pre;
    }
    if (pre || line.startsWith('  [')) {
      lines.push(line);
    } else if (line.match(/^[=-]+$/) && lastLineLen > 0) {
      lines.push(line.slice(0, lastLineLen));
    } else if (wrap) {
      for (const wrapped of wordwrap(wrap)(line).split('\n')) {
        lines.push(wrapped);
      }
    } else {
      lines.push(line);
    }
  }
  const text = lines.join('\n');
  return postrender(text, opts);
}

const criticHTML = (text) =>
  text
    .replace(regex.critic.del, '<del>$1</del>')
    .replace(regex.critic.ins, '<ins>$1</ins>')
    .replace(regex.critic.sub, '<del>$1</del><ins>$2</ins>');

const criticLaTeX = (text) =>
  '\\useunder{\\uline}{\\ulined}{}\n' +
  text
    .replace(
      regex.critic.del,
      '<span>\\color{Maroon}~~<span>$1</span>~~</span>'
    )
    .replace(regex.critic.ins, '<span>\\color{OliveGreen}\\ulined{}$1</span>')
    .replace(
      regex.critic.sub,
      '<span>\\color{RedOrange}~~<span>$1</span>~~<span>\\ulined{}$2</span></span>'
    );

function criticTrackChanges(text: string): string {
  return text
    .replace(regex.critic.del, '<span class="deletion">$1</span>')
    .replace(regex.critic.ins, '<span class="insertion">$1</span>')
    .replace(
      regex.critic.sub,
      '<span class="deletion">$1</span><span class="insertion">$2</span>'
    );
}

export function criticReject(text: string): string {
  return text
    .replace(regex.critic.del, '$1')
    .replace(regex.critic.ins, '')
    .replace(regex.critic.sub, '$1');
}

export function criticAccept(text: string): string {
  return text
    .replace(regex.critic.del, '')
    .replace(regex.critic.ins, '$1')
    .replace(regex.critic.sub, '$2');
}

const pandocOptionsHTML = [
  // '--css',
  // require.resolve('github-markdown-css'),
  // '--css',
  // path.join(__dirname, 'pandiff.css'),
  '--variable',
  'include-before=<article class="markdown-body">',
  '--variable',
  'include-after=</article>',
  '--self-contained',
];

async function postrender(
  text: string,
  opts: Options = {}
): Promise<string | null> {
  if (!opts.output && !opts.to) {
    return text;
  }

  if (!('highlight-style' in opts)) {
    opts['highlight-style'] = 'kate';
  }
  let args = buildArgs(
    opts,
    'highlight-style',
    'output',
    'pdf-engine',
    'resource-path',
    'standalone',
    'to'
  );
  const outputExt = opts.output ? path.extname(opts.output) : null;
  if (outputExt === '.pdf') {
    opts.standalone = true;
  }

  if (opts.to === 'latex' || outputExt === '.tex' || outputExt === '.pdf') {
    text = criticLaTeX(text);
    args.push('--variable', 'colorlinks=true');
  } else if (opts.to === 'docx' || outputExt === '.docx') {
    text = criticTrackChanges(text);
  } else if (opts.to === 'html' || outputExt === '.html') {
    text = criticHTML(text);
    const paras = text
      .split('\n\n')
      .map((p) =>
        p.startsWith('<ins>') || p.startsWith('<del>') ? '<p>' + p + '</p>' : p
      );
    text = paras.join('\n\n');
    if (opts.standalone) {
      args = args.concat(pandocOptionsHTML);
    }
  }

  if (opts.output) {
    await sh.pandoc(...args).end(text);
    return null;
  } else {
    return sh
      .pandoc(...args)
      .end(text)
      .toString();
  }
}

export async function pandoc(
  source: string,
  opts: Options = {}
): Promise<string | null> {
  const args = buildArgs(
    opts,
    'bibliography',
    'extract-media',
    'filter',
    'from',
    'resource-path',
    'output',
    'pdf-engine',
    'to'
  );

  if (opts.output) {
    await sh.pandoc(...args).end(source);
    return null;
  } else {
    return sh
      .pandoc(...args)
      .end(source)
      .toString();
  }
}

export async function pandiff(
  source1: string,
  source2: string,
  opts: Options = {}
): Promise<string | null> {
  const html1 = await convert(source1, opts);
  const html2 = await convert(source2, opts);
  const html = htmldiff(html1, html2);

  const unmodified = html
    .replace(/<del.*?del>/g, '')
    .replace(/<ins.*?ins>/g, '');
  const similarity = unmodified.length / html.length;
  if (opts.threshold && similarity < opts.threshold) {
    console.error(
      Math.round(100 - 100 * similarity) + '% of the content has changed'
    );
    return null;
  } else {
    return render(html, opts);
  }
}

export async function trackChanges(file: string, opts = {}): Promise<string> {
  return sh
    .pandoc(file, '--track-changes=all')
    .toString()
    .then((html) => render(html, opts));
}
export async function normalise(text: string, opts = {}): Promise<string> {
  return pandiff(criticReject(text), criticAccept(text), opts);
}
