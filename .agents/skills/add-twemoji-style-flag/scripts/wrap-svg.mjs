#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const [inputArgument, outputArgument] = process.argv.slice(2);

if (!inputArgument || !outputArgument || process.argv.length !== 4) {
  console.error('Usage: node wrap-svg.mjs <input.svg> <output.svg>');
  process.exitCode = 1;
} else {
  const inputPath = path.resolve(inputArgument);
  const outputPath = path.resolve(outputArgument);
  const source = (await readFile(inputPath, 'utf8')).replace(/^\uFEFF/u, '');
  const svg = /<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/iu.exec(source);

  if (!svg) {
    throw new Error(`Could not find a complete SVG root in ${inputArgument}.`);
  }

  const attributes = svg[1] ?? '';
  const content = (svg[2] ?? '').trim();
  const namespaceAttributes = new Map();
  for (const match of attributes.matchAll(/\bxmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])([^"']+)\2/gu)) {
    const prefix = match[1];
    const declaration = match[0];
    if (prefix && declaration && prefix.toLowerCase() !== 'xlink') {
      namespaceAttributes.set(prefix, declaration);
    }
  }
  const additionalNamespaces =
    namespaceAttributes.size === 0 ? '' : ` ${[...namespaceAttributes.values()].join(' ')}`;
  const viewBoxMatch = /\bviewBox\s*=\s*["']([^"']+)["']/iu.exec(attributes);
  let viewBox;

  if (viewBoxMatch?.[1]) {
    viewBox = viewBoxMatch[1]
      .trim()
      .split(/[\s,]+/u)
      .map(Number);
  } else {
    const width = /\bwidth\s*=\s*["']([0-9]+(?:\.[0-9]+)?)/iu.exec(attributes)?.[1];
    const height = /\bheight\s*=\s*["']([0-9]+(?:\.[0-9]+)?)/iu.exec(attributes)?.[1];
    viewBox = [0, 0, Number(width), Number(height)];
  }

  if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    throw new Error(`Could not determine a numeric SVG viewport for ${inputArgument}.`);
  }

  const indentedContent = content
    .split(/\r?\n/u)
    .map((line) => {
      const trimmed = line.trimEnd();
      if (trimmed === '') return '';

      const indentation = /^[\t ]*/u.exec(trimmed)?.[0] ?? '';
      return `      ${indentation.replace(/\t/gu, '  ')}${trimmed.slice(indentation.length)}`;
    })
    .join('\n');
  const normalizedViewBox = viewBox.join(' ');
  const output = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"${additionalNamespaces} viewBox="0 0 36 36">
  <defs>
    <clipPath id="flag-resizer-rounded-clip">
      <rect width="36" height="26" y="5" rx="4"/>
    </clipPath>
  </defs>
  <g clip-path="url(#flag-resizer-rounded-clip)">
    <svg x="0" y="5" width="36" height="26" viewBox="${normalizedViewBox}" preserveAspectRatio="none">
${indentedContent}
    </svg>
  </g>
</svg>
`;

  await writeFile(outputPath, output);
  console.log(`Wrapped ${inputArgument} as ${outputArgument}`);
}
