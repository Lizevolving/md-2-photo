/**
 * Removes Markdown formatting from text
 */
export function removeMarkdown(text: string): string {
  if (!text) return '';

  let plainText = text
    // Remove headers
    .replace(/^#{1,6}\s/gm, '')
    // Remove blockquotes
    .replace(/^>\s/gm, '')
    // Remove list markers
    .replace(/^[*+-]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove emphasis
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]+)\]\([^)]+\)/g, '')
    // Remove horizontal rules
    .replace(/^-{3,}|={3,}|\*{3,}$/gm, '')
    // Remove tables
    .replace(/\|[^\n]*\|/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove extra whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return plainText;
}