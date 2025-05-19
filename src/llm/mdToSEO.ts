// src/llm/mdToSEO.ts
import { pipeline, env, PipelineType } from "@xenova/transformers";
import type { SEOData } from "../core/types"; // 공용 SEOData 타입 사용

/**
 * @file This module is responsible for generating SEO (Search Engine Optimization) data,
 * specifically titles and descriptions, for English Markdown content using Large Language Models (LLMs)
 * via the Transformers.js library. It includes language detection, prompt construction,
 * LLM response parsing, and conditional execution based on content length.
 */

/**
 * Internal configuration interface for LLM interactions specific to this module.
 * It defines parameters that control the LLM model used and content length thresholds
 * for triggering SEO generation. This is used by `markdownToSEO` and can be partially
 * populated from `LLMConfigOptions` (defined in `core/types.ts`).
 *
 * Properties:
 * - `modelName`: Optional. The specific Hugging Face model identifier for the LLM (e.g., 'Xenova/LaMini-Flan-T5-783M').
 * If not provided, `DEFAULT_MODEL_FOR_TEXT_GENERATION` is used.
 * - `minContentLengthForSeo`: Optional. The minimum number of words the content must have
 * to attempt SEO data generation.
 * - `maxContentLengthForPrompt`: Optional. The maximum number of words from the beginning of the content
 * to use as an excerpt in the LLM prompt.
 */
export interface LLMConfig {
  modelName?: string;
  minContentLengthForSeo?: number;
  maxContentLengthForPrompt?: number;
}

// Configure Transformers.js to allow loading local models.
// This might be relevant if models are cached locally or self-hosted.
env.allowLocalModels = true;

/** Default LLM model to use for text generation if not specified in LLMConfig. */
const DEFAULT_MODEL_FOR_TEXT_GENERATION = "Xenova/LaMini-Flan-T5-783M";

/**
 * Performs a basic heuristic check to determine if the given text is likely primarily English.
 * It scans for characters from common non-English scripts (Korean, Japanese, Chinese, Cyrillic).
 * @param {string} text - The text string to check.
 * @returns {boolean} `true` if the text is likely English (or contains no obvious non-English script characters), `false` otherwise.
 */
function isLikelyEnglish(text: string): boolean {
  if (!text) return true; // Treat empty or null strings as "likely English" to avoid skipping unnecessarily.

  // Regex for common non-English scripts.
  const nonEnglishScripts = [
    /[\u3131-\uD79D\uAC00-\uD7AF]/, // Hangul (Korean)
    /[\u3040-\u309F\u30A0-\u30FF]/, // Hiragana, Katakana (Japanese)
    /[\u4E00-\u9FFF]/, // CJK Unified Ideographs (Chinese)
    /[\u0400-\u04FF]/, // Cyrillic
    // Add more scripts if needed for broader filtering.
  ];

  for (const scriptRegex of nonEnglishScripts) {
    if (scriptRegex.test(text)) {
      return false; // Non-English script character found.
    }
  }
  return true; // No common non-English script characters detected.
}

/**
 * Constructs a prompt for an English LLM to generate an SEO title and meta description.
 * The prompt specifies the desired output format and length constraints.
 * @param {string} originalTitle - The original title of the blog post.
 * @param {string} contentExcerpt - An excerpt of the blog post content.
 * @returns {string} A formatted prompt string for the LLM.
 */
function constructEnglishSEOPrompt(
  originalTitle: string,
  contentExcerpt: string
): string {
  return `
Based on the original title and content excerpt of the following blog post:
Original Title: "${originalTitle}"
Content Excerpt: "${contentExcerpt}"

Please generate an SEO-optimized title (around 50-70 characters) and a meta description (around 100-160 characters).

Respond in the following format, using these exact labels. Do not include any other conversation or explanations:
SEO Title: [Your suggested SEO title here]
Meta Description: [Your suggested meta description here]

If it's difficult to generate a better title, you can use or slightly modify the original title.
`.trim();
}

/**
 * Parses the LLM's text response to extract the SEO title and meta description.
 * It looks for specific labels ("SEO Title:", "Meta Description:") in the response
 * and handles cases where labels might be missing or the formatting is imperfect.
 * It also removes surrounding double quotes from the extracted title and description.
 * @param {string | undefined} responseText - The raw text response from the LLM.
 * @param {string} originalTitle - The original title, used as a fallback if an SEO title cannot be parsed.
 * @returns {SEOData} An object containing the parsed `title` and `description`. Keywords are currently set to `undefined`.
 */
function parseEnglishSEOResponse(
  responseText: string | undefined,
  originalTitle: string
): SEOData {
  let seoTitle = originalTitle; // Default to original title.
  let seoDescription: string | undefined = undefined;

  if (!responseText) {
    return {
      title: originalTitle,
      description: undefined,
      keywords: undefined, // Keywords are not generated by current prompt/parsing.
    };
  }

  // Attempt to parse "SEO Title:".
  // Captures text after "SEO Title:" until a newline followed by "Meta Description:" or end of string.
  const titleMatch = responseText.match(
    /SEO Title:(.*?)(?:\nMeta Description:|$)/is
  );
  if (titleMatch && titleMatch[1] && titleMatch[1].trim()) {
    seoTitle = titleMatch[1].trim();
    // Remove surrounding quotes, if present.
    if (seoTitle.startsWith('"') && seoTitle.endsWith('"')) {
      seoTitle = seoTitle.substring(1, seoTitle.length - 1);
    }
  }

  // Attempt to parse "Meta Description:".
  // Captures text after "Meta Description:" until the end of the string.
  const descriptionMatch = responseText.match(/Meta Description:(.*)$/is);
  if (descriptionMatch && descriptionMatch[1] && descriptionMatch[1].trim()) {
    seoDescription = descriptionMatch[1].trim();
    // Remove surrounding quotes, if present.
    if (seoDescription.startsWith('"') && seoDescription.endsWith('"')) {
      seoDescription = seoDescription.substring(1, seoDescription.length - 1);
    }
  } else if (!titleMatch && responseText.trim()) {
    // Fallback: If "SEO Title:" was not found but there's response text,
    // assume the remaining text might be the description (or parts of it).
    // This is a heuristic and might need refinement based on typical LLM failure modes.
    const cleanedResponse = responseText
      .replace(/SEO Title:.*?(\n|$)/is, "") // Attempt to remove any title part if it was missed.
      .trim();
    if (cleanedResponse) {
      // Only assign to description if the title is still the original one (meaning title parsing also failed).
      if (seoTitle === originalTitle) {
        seoDescription = cleanedResponse.substring(0, 160); // Truncate to a reasonable length.
        if (seoDescription.startsWith('"') && seoDescription.endsWith('"')) {
          seoDescription = seoDescription.substring(
            1,
            seoDescription.length - 1
          );
        }
      }
    }
  }

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: undefined,
  };
}

/**
 * Orchestrates the generation of SEO data (title, description) for a given Markdown content.
 *
 * It first checks if the content's original title is likely English and if the content
 * meets a minimum length requirement. If these conditions are met, it invokes an LLM
 * using a structured prompt to generate SEO-friendly text. The LLM's response is then
 * parsed to extract the relevant SEO fields.
 *
 * @async
 * @param {string} originalTitle - The original title of the Markdown note.
 * @param {string} content - The full Markdown content of the note.
 * @param {LLMConfig} config - Configuration for LLM interaction, including model name
 * and content length thresholds.
 * @returns {Promise<SEOData | undefined>} A promise that resolves to an `SEOData` object
 * if generation is successful, or `undefined` if generation is skipped (due to language,
 * content length) or if an error occurs during the process.
 */
export async function markdownToSEO(
  originalTitle: string,
  content: string,
  config: LLMConfig
): Promise<SEOData | undefined> {
  // 1. Pre-condition check: Skip if the title doesn't appear to be English.
  if (!isLikelyEnglish(originalTitle)) {
    // console.debug(`[MarkBoost-SEO] LLM SEO skipped for "${originalTitle}": Non-English title.`);
    return undefined;
  }

  // Destructure LLM config with defaults.
  const {
    modelName = config.modelName || DEFAULT_MODEL_FOR_TEXT_GENERATION,
    minContentLengthForSeo = config.minContentLengthForSeo || 50, // Default word count
    maxContentLengthForPrompt = config.maxContentLengthForPrompt || 250, // Default word count
  } = config;

  // 2. Pre-condition check: Skip if content is too short.
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < minContentLengthForSeo) {
    // console.debug(`[MarkBoost-SEO] LLM SEO skipped for "${originalTitle}": Content too short (${wordCount} words).`);
    return undefined;
  }

  // Prepare content excerpt for the LLM prompt.
  const contentExcerpt = content
    .split(/\s+/)
    .slice(0, maxContentLengthForPrompt)
    .join(" ");

  try {
    // Initialize the text-to-text generation pipeline with the specified model.
    const generator = await pipeline("text2text-generation", modelName);

    // Construct the prompt for the LLM.
    const prompt = constructEnglishSEOPrompt(originalTitle, contentExcerpt);

    // Generate text using the LLM.
    // `min_new_tokens` and `max_new_tokens` guide the length of the generated output.
    const outputs = await generator(prompt, {
      min_new_tokens: 15, // Minimum tokens to ensure some output for title/description.
      max_new_tokens: 120, // Max tokens, adjusted for title and description generation.
    });

    let generatedText: string | undefined;

    // Extract generated text from the pipeline's output.
    // The output can be an array or a single object.
    // Note: `as any` is used here for simplicity; for robust typing,
    // import specific output types from Transformers.js if available and clear.
    if (
      Array.isArray(outputs) &&
      outputs.length > 0 &&
      typeof (outputs[0] as any).generated_text === "string"
    ) {
      generatedText = (outputs[0] as any).generated_text;
    } else if (
      !Array.isArray(outputs) &&
      typeof (outputs as any).generated_text === "string"
    ) {
      generatedText = (outputs as any).generated_text;
    }

    if (generatedText) {
      // Parse the LLM's response to extract structured SEO data.
      return parseEnglishSEOResponse(generatedText, originalTitle);
    } else {
      console.warn(
        `[MarkBoost-SEO] No text generated by ${modelName} for "${originalTitle}".`
      );
      return undefined;
    }
  } catch (error) {
    console.error(
      `[MarkBoost-SEO] Error during SEO generation for "${originalTitle}" (model: ${modelName}):`,
      error
    );
    return undefined;
  }
}
