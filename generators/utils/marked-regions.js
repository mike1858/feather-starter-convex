/**
 * Marked region parser for smart merge during generator re-runs.
 * Extracts custom code blocks and re-injects them after regeneration.
 */

// TS-style markers: // @custom-start key ... // @custom-end key
const TS_CUSTOM_PATTERN =
  /\/\/\s*@custom-start\s+(\S+)[^\n]*\n([\s\S]*?)\/\/\s*@custom-end\s+\1/g;

// JSX-style markers: {/* @custom-start key */} ... {/* @custom-end key */}
const JSX_CUSTOM_PATTERN =
  /\{\/\*\s*@custom-start\s+(\S+)\s*\*\/\}\s*\n([\s\S]*?)\{\/\*\s*@custom-end\s+\1\s*\*\/\}/g;

/**
 * Extract custom regions from file content.
 * Scans for both TS-style (// @custom-start) and JSX-style markers.
 * @param {string} fileContent - Content of the file to extract from
 * @returns {Map<string, string>} Map of region key to content between markers
 */
export function extractCustomRegions(fileContent) {
  /** @type {Map<string, string>} */
  const regions = new Map();

  // Extract TS-style custom regions
  for (const match of fileContent.matchAll(TS_CUSTOM_PATTERN)) {
    const key = match[1];
    const content = match[2];
    // Only store if there's actual content (not just whitespace/comments placeholder)
    if (content.trim().length > 0) {
      regions.set(key, content);
    }
  }

  // Extract JSX-style custom regions
  for (const match of fileContent.matchAll(JSX_CUSTOM_PATTERN)) {
    const key = match[1];
    const content = match[2];
    if (content.trim().length > 0) {
      regions.set(key, content);
    }
  }

  return regions;
}

/**
 * Inject custom regions into freshly generated content.
 * Replaces content between @custom-start/@custom-end markers with saved content.
 * @param {string} newContent - Freshly generated file content with empty custom blocks
 * @param {Map<string, string>} customRegions - Map of region key to saved content
 * @returns {string} Merged file content
 */
export function injectCustomRegions(newContent, customRegions) {
  if (customRegions.size === 0) return newContent;

  let result = newContent;

  // Inject into TS-style markers
  result = result.replace(TS_CUSTOM_PATTERN, (fullMatch, key, _existing) => {
    const saved = customRegions.get(key);
    if (saved !== undefined) {
      return `// @custom-start ${key}\n${saved}// @custom-end ${key}`;
    }
    return fullMatch;
  });

  // Inject into JSX-style markers
  result = result.replace(JSX_CUSTOM_PATTERN, (fullMatch, key, _existing) => {
    const saved = customRegions.get(key);
    if (saved !== undefined) {
      return `{/* @custom-start ${key} */}\n${saved}{/* @custom-end ${key} */}`;
    }
    return fullMatch;
  });

  return result;
}
