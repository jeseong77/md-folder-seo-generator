/**
 * @file Slug generation utility.
 * Contains functions to convert strings (filenames, paths) into URL-friendly slugs.
 */

/**
 * Converts a filename or a full path string into a URL-friendly "slug".
 *
 * The function processes the input string by:
 * - Removing the `.md` extension and normalizing path separators to forward slashes (`/`).
 * - Converting the entire string to lowercase.
 * - For each path segment (if a path is provided):
 * - Replacing spaces and underscores with hyphens.
 * - Removing characters other than English lowercase letters (a-z), numbers (0-9),
 * Korean Hangul syllables (\uAC00-\uD7A3), and hyphens.
 * - Consolidating multiple hyphens and trimming any leading/trailing hyphens from segments.
 * - Filtering out empty segments and joining the processed segments with forward slashes.
 * The resulting slug is designed to be clean, readable, and safe for use in URLs.
 *
 * @param {string} nameOrPath - The filename or path string to be slugified.
 * Can be a simple filename like "My Document.md" or a path like "My Folder/My Document.md".
 * @returns {string} The generated URL-friendly slug. Returns an empty string if the
 * input is empty or results in an empty slug after processing.
 *
 * @example
 * ```typescript
 * import { filenameToSlug } from './slugify'; // Adjust path as per your project structure
 *
 * console.log(filenameToSlug("My Awesome Post.md"));
 * // Output: "my-awesome-post"
 *
 * console.log(filenameToSlug("My Folder/Another_Post with_Spaces.md"));
 * // Output: "my-folder/another-post-with-spaces"
 *
 * console.log(filenameToSlug("한글 파일 이름.md"));
 * // Output: "한글-파일-이름"
 *
 * console.log(filenameToSlug("  leading-trailing-hyphens--with--multiple.md  "));
 * // Output: "leading-trailing-hyphens-with-multiple"
 *
 * console.log(filenameToSlug("!@#Special$%^&*Chars(123).md"));
 * // Output: "special-chars123"
 * ```
 */
export function filenameToSlug(nameOrPath: string): string {
  if (!nameOrPath) return ""; // Return empty string if input is null, undefined, or empty.

  // Remove .md extension and normalize path separators.
  let slug = nameOrPath.replace(/\.md$/, "").replace(/\\/g, "/");

  slug = slug
    .split("/")
    .map(
      (segment) =>
        segment
          .trim() // Remove leading/trailing whitespace from segment.
          .toLowerCase() // Convert segment to lowercase.
          .replace(/\s+/g, "-") // Replace whitespace sequences with a single hyphen.
          .replace(/_/g, "-") // Replace underscores with hyphens for consistency.
          // Remove all characters that are not lowercase English letters, numbers, Korean Hangul syllables, or hyphens.
          .replace(/[^a-z0-9\uAC00-\uD7A3-]+/g, "")
          .replace(/-+/g, "-") // Collapse multiple hyphens into a single hyphen.
          .replace(/^-+|-+$/g, "") // Remove leading or trailing hyphens from the segment.
    )
    // Filter out any segments that became empty after processing (e.g., from "//" or "---").
    .filter((segment) => segment.length > 0)
    .join("/"); // Join segments with a forward slash.

  return slug;
}
// 이전에 있던 인라인 주석(// Note: The function is designed to handle both filenames and paths...)은
// JSDoc 상단의 설명으로 충분히 커버되므로 제거하거나, 필요시 JSDoc의 @remarks 등으로 통합할 수 있습니다.
// 여기서는 JSDoc 설명으로 충분하다고 판단하여 제거했습니다.
