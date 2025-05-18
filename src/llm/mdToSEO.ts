// src/llm/mdToSEO.ts
import {
    pipeline,
    env,
} from '@xenova/transformers';
import type { SEOData, LLMConfig } from '../types';

env.allowLocalModels = true;

const DEFAULT_MODEL_FOR_TEXT_GENERATION = 'Xenova/LaMini-Flan-T5-783M';

/**
 * Checks if the given text is likely primarily English.
 * Skips LLM processing if common non-English scripts are detected in the title.
 * @param text The text to check.
 * @returns True if likely English, false otherwise.
 */
function isLikelyEnglish(text: string): boolean {
    if (!text) return true;

    const nonEnglishScripts = [
        /[\u3131-\uD79D\uAC00-\uD7AF]/, // Hangul (Korean)
        /[\u3040-\u309F\u30A0-\u30FF]/, // Hiragana, Katakana (Japanese)
        /[\u4E00-\u9FFF]/,             // CJK Unified Ideographs (Chinese)
        /[\u0400-\u04FF]/,             // Cyrillic
    ];

    for (const scriptRegex of nonEnglishScripts) {
        if (scriptRegex.test(text)) {
            return false;
        }
    }
    return true;
}

function constructEnglishSEOPrompt(originalTitle: string, contentExcerpt: string): string {
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

function parseEnglishSEOResponse(
    responseText: string | undefined,
    originalTitle: string
): SEOData {
    let seoTitle = originalTitle;
    let seoDescription: string | undefined = undefined;

    if (!responseText) {
        return { title: originalTitle, description: undefined, keywords: undefined };
    }

    const titleMatch = responseText.match(/SEO Title:(.*?)(?:\nMeta Description:|$)/is);
    if (titleMatch && titleMatch[1] && titleMatch[1].trim()) {
        seoTitle = titleMatch[1].trim();
    }

    const descriptionMatch = responseText.match(/Meta Description:(.*)$/is);
    if (descriptionMatch && descriptionMatch[1] && descriptionMatch[1].trim()) {
        seoDescription = descriptionMatch[1].trim();
        // Remove leading and trailing double quotes if they exist
        if (seoDescription.startsWith('"') && seoDescription.endsWith('"')) {
            seoDescription = seoDescription.substring(1, seoDescription.length - 1);
        }
    } else if (!titleMatch && responseText.trim()) {
        const cleanedResponse = responseText.replace(/SEO Title:.*?(\n|$)/is, '').trim();
        if (cleanedResponse) {
            if (seoTitle === originalTitle) {
                seoDescription = cleanedResponse.substring(0, 160);
                // Also remove quotes here if this fallback is used
                if (seoDescription.startsWith('"') && seoDescription.endsWith('"')) {
                    seoDescription = seoDescription.substring(1, seoDescription.length - 1);
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

export async function markdownToSEO(
    originalTitle: string,
    content: string,
    config: LLMConfig
): Promise<SEOData | undefined> {
    if (!isLikelyEnglish(originalTitle)) {
        // console.log(`Skipping LLM SEO generation for "${originalTitle}" as non-English title detected.`);
        return undefined;
    }

    const {
        modelName = config.modelName || DEFAULT_MODEL_FOR_TEXT_GENERATION,
        minContentLengthForSeo = config.minContentLengthForSeo || 50,
        maxContentLengthForPrompt = config.maxContentLengthForPrompt || 250,
    } = config;

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (wordCount < minContentLengthForSeo) {
        // console.log(`Content for "${originalTitle}" is too short (${wordCount} words). Skipping LLM SEO generation.`);
        return undefined;
    }

    const contentExcerpt = content.split(/\s+/).slice(0, maxContentLengthForPrompt).join(" ");

    try {
        // console.log(`Attempting English SEO (Title & Desc) generation for "${originalTitle}" with model: ${modelName}`);
        const generator = await pipeline('text2text-generation', modelName);

        const prompt = constructEnglishSEOPrompt(originalTitle, contentExcerpt);

        const outputs = await generator(prompt, {
            min_new_tokens: 15,
            max_new_tokens: 120,
        });

        let generatedText: string | undefined;

        if (Array.isArray(outputs) && outputs.length > 0 && typeof (outputs[0] as any).generated_text === 'string') {
            generatedText = (outputs[0] as any).generated_text;
        } else if (!Array.isArray(outputs) && typeof (outputs as any).generated_text === 'string') {
            generatedText = (outputs as any).generated_text;
        }

        if (generatedText) {
            return parseEnglishSEOResponse(generatedText, originalTitle);
        } else {
            console.warn(`No text generated by ${modelName} for "${originalTitle}".`);
            return undefined;
        }

    } catch (error) {
        console.error(`Error during SEO generation for "${originalTitle}" (model: ${modelName}):`, error);
        return undefined;
    }
}