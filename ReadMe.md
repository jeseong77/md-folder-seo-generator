# @jeseong77/markboost-seo

Scans Markdown files to extract metadata and auto-generate SEO information (titles, descriptions) for English content using local LLMs.

**Author's Site / Example:** [Library applied website](https://www.jeseong.com)

[![npm version](https://badge.fury.io/js/%40jeseong77%2Fmarkboost-seo.svg)](https://badge.fury.io/js/%40jeseong77%2Fmarkboost-seo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

`@jeseong77/markboost-seo` is a Node.js library that processes your Markdown content to:
* Extract titles and file paths.
* Generate URL-friendly slugs.
* Optionally, use local LLMs (`@xenova/transformers`) to generate SEO titles and meta descriptions for **English content**.
* Return structured data for easy use in Static Site Generators (SSGs) or other tools.

## Installation

```bash
npm install @jeseong77/markboost-seo
# or
yarn add @jeseong77/markboost-seo
````

## Quick Start

```typescript
import { scanAndProcessNotes, ScanOptions } from '@jeseong77/markboost-seo';
import path from 'path';

async function main() {
  const options: ScanOptions = {
    contentPath: path.join(process.cwd(), 'my-markdown-vault'),
    generateSeo: true, // Enable LLM SEO for English content
    llmConfig: {
      minContentLengthForSeo: 50, // words
      // maxContentLengthForPrompt: 250, // words (default)
      // modelName: 'Xenova/LaMini-Flan-T5-783M' // Default model
    },
  };

  try {
    const result = await scanAndProcessNotes(options);
    console.log(`Processed ${result.allNotes.length} notes.`);
    result.allNotes.forEach(note => {
      if (note.seo) {
        // console.log(note.title, note.seo.description);
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

## Key Options (`ScanOptions`)

  * `contentPath: string`: **Required.** Path to your Markdown directory.
  * `generateSeo?: boolean`: Set to `true` to enable LLM-based SEO (default: `false`).
  * `llmConfig?: LLMConfigOptions`: Configure LLM model, content length thresholds.
  * `ignorePatterns?: string[]`: Glob patterns for files/folders to ignore.
  * `includeFileContent?: boolean`: Include full Markdown content in results (default: `false`).
  * `forceScan?: boolean`: Force re-scan, bypassing cache in production (default: `false`).

## Output (`ScanResult`)

The `scanAndProcessNotes` function returns a `ScanResult` object containing:

  * `allNotes: ProcessedNode[]`: Array of processed file data. Each `ProcessedNode` includes `id`, `title`, `filePath`, `fullPathSlug`, `simpleSlug`, and an optional `seo` object (`{ title?: string, description?: string }`).
  * `notesMapByFullPathSlug: Map<string, ProcessedNode>`
  * `notesMapBySimpleSlug: Map<string, Set<string>>`

## Note on LLM SEO

  * LLM processing is currently optimized for generating **meta descriptions for English content**.
  * SEO titles from LLM often default to the original title.
  * Performance on CPU can be slow for LLM tasks.

## License

MIT - See [LICENSE](https://www.google.com/search?q=LICENSE) file.
