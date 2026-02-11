import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FRONTEND_SRC = '/vercel/share/v0-project/frontend/src';

// Collect all .tsx and .ts files recursively
function getAllFiles(dir, ext = ['.tsx', '.ts']) {
  let results = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (ext.some(e => fullPath.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Replacement rules: [pattern, replacement]
// We apply these in order; each is a global regex replacement
const replacements = [
  // === BACKGROUNDS ===
  // bg-white dark:bg-gray-800 → bg-card
  [/bg-white\s+dark:bg-gray-800/g, 'bg-card'],
  // bg-white dark:bg-gray-900 → bg-background
  [/bg-white\s+dark:bg-gray-900/g, 'bg-background'],
  // bg-white dark:bg-gray-700 → bg-card
  [/bg-white\s+dark:bg-gray-700/g, 'bg-card'],
  // bg-gray-50 dark:bg-gray-900 → bg-background
  [/bg-gray-50\s+dark:bg-gray-900/g, 'bg-background'],
  // bg-gray-50 dark:bg-gray-800 → bg-muted\/50
  [/bg-gray-50\s+dark:bg-gray-800/g, 'bg-muted/50'],
  // bg-gray-50 dark:bg-gray-700\/50 → bg-muted/50
  [/bg-gray-50\s+dark:bg-gray-700\/50/g, 'bg-muted/50'],
  // bg-gray-100 dark:bg-gray-800\/50 → bg-muted
  [/bg-gray-100\s+dark:bg-gray-800\/50/g, 'bg-muted'],
  // bg-gray-100 dark:bg-gray-700 → bg-muted
  [/bg-gray-100\s+dark:bg-gray-700/g, 'bg-muted'],
  // bg-gray-100 dark:bg-gray-600 → bg-muted
  [/bg-gray-100\s+dark:bg-gray-600/g, 'bg-muted'],
  // bg-gray-200 dark:bg-gray-700 → bg-muted
  [/bg-gray-200\s+dark:bg-gray-700/g, 'bg-muted'],
  // bg-gray-200 dark:bg-gray-600 → bg-muted
  [/bg-gray-200\s+dark:bg-gray-600/g, 'bg-muted'],

  // Standalone bg patterns (only when not already followed by dark:)
  // bg-white that's standalone
  [/(?<!\S)bg-white(?!\s+dark:)(?=[\s"'`}])/g, 'bg-card'],
  // bg-gray-50 standalone 
  [/(?<!\S)bg-gray-50(?!\s+dark:)(?=[\s"'`}])/g, 'bg-muted/50'],
  // bg-gray-100 standalone
  [/(?<!\S)bg-gray-100(?!\s+dark:)(?=[\s"'`}])/g, 'bg-muted'],

  // === TEXT COLORS ===
  // text-gray-900 dark:text-gray-100 → text-foreground
  [/text-gray-900\s+dark:text-gray-100/g, 'text-foreground'],
  // text-gray-900 dark:text-white → text-foreground
  [/text-gray-900\s+dark:text-white/g, 'text-foreground'],
  // text-gray-900 dark:text-gray-200 → text-foreground
  [/text-gray-900\s+dark:text-gray-200/g, 'text-foreground'],
  // text-gray-800 dark:text-white → text-foreground
  [/text-gray-800\s+dark:text-white/g, 'text-foreground'],
  // text-gray-800 dark:text-gray-200 → text-foreground
  [/text-gray-800\s+dark:text-gray-200/g, 'text-foreground'],
  // text-gray-800 dark:text-gray-100 → text-foreground
  [/text-gray-800\s+dark:text-gray-100/g, 'text-foreground'],
  // text-gray-700 dark:text-gray-300 → text-foreground
  [/text-gray-700\s+dark:text-gray-300/g, 'text-foreground'],
  // text-gray-700 dark:text-gray-200 → text-foreground
  [/text-gray-700\s+dark:text-gray-200/g, 'text-foreground'],
  // text-gray-600 dark:text-gray-400 → text-muted-foreground
  [/text-gray-600\s+dark:text-gray-400/g, 'text-muted-foreground'],
  // text-gray-600 dark:text-gray-300 → text-muted-foreground
  [/text-gray-600\s+dark:text-gray-300/g, 'text-muted-foreground'],
  // text-gray-500 dark:text-gray-400 → text-muted-foreground
  [/text-gray-500\s+dark:text-gray-400/g, 'text-muted-foreground'],
  // text-gray-500 dark:text-gray-300 → text-muted-foreground
  [/text-gray-500\s+dark:text-gray-300/g, 'text-muted-foreground'],
  // text-gray-500 dark:text-gray-500 → text-muted-foreground
  [/text-gray-500\s+dark:text-gray-500/g, 'text-muted-foreground'],
  // text-gray-400 dark:text-gray-500 → text-muted-foreground
  [/text-gray-400\s+dark:text-gray-500/g, 'text-muted-foreground'],
  // text-gray-400 dark:text-gray-400 → text-muted-foreground
  [/text-gray-400\s+dark:text-gray-400/g, 'text-muted-foreground'],

  // Standalone text patterns
  [/(?<!\S)text-gray-900(?!\s+dark:)(?=[\s"'`}])/g, 'text-foreground'],
  [/(?<!\S)text-gray-800(?!\s+dark:)(?=[\s"'`}])/g, 'text-foreground'],
  [/(?<!\S)text-gray-700(?!\s+dark:)(?=[\s"'`}])/g, 'text-foreground/80'],
  [/(?<!\S)text-gray-600(?!\s+dark:)(?=[\s"'`}])/g, 'text-muted-foreground'],
  [/(?<!\S)text-gray-500(?!\s+dark:)(?=[\s"'`}])/g, 'text-muted-foreground'],
  [/(?<!\S)text-gray-400(?!\s+dark:)(?=[\s"'`}])/g, 'text-muted-foreground'],

  // === BORDERS ===
  // border-gray-100 dark:border-gray-700 → border-border
  [/border-gray-100\s+dark:border-gray-700/g, 'border-border'],
  // border-gray-200 dark:border-gray-700 → border-border
  [/border-gray-200\s+dark:border-gray-700/g, 'border-border'],
  // border-gray-200 dark:border-gray-600 → border-border
  [/border-gray-200\s+dark:border-gray-600/g, 'border-border'],
  // border-gray-300 dark:border-gray-600 → border-border
  [/border-gray-300\s+dark:border-gray-600/g, 'border-border'],
  // border-gray-300 dark:border-gray-700 → border-border
  [/border-gray-300\s+dark:border-gray-700/g, 'border-border'],

  // Standalone border patterns
  [/(?<!\S)border-gray-100(?!\s+dark:)(?=[\s"'`}])/g, 'border-border'],
  [/(?<!\S)border-gray-200(?!\s+dark:)(?=[\s"'`}])/g, 'border-border'],
  [/(?<!\S)border-gray-300(?!\s+dark:)(?=[\s"'`}])/g, 'border-border'],

  // === DIVIDE ===
  [/divide-gray-200\s+dark:divide-gray-700/g, 'divide-border'],
  [/(?<!\S)divide-gray-200(?!\s+dark:)(?=[\s"'`}])/g, 'divide-border'],

  // === HOVER BACKGROUNDS ===
  [/hover:bg-gray-50\s+dark:hover:bg-gray-700\/50/g, 'hover:bg-accent'],
  [/hover:bg-gray-50\s+dark:hover:bg-gray-700/g, 'hover:bg-accent'],
  [/hover:bg-gray-100\s+dark:hover:bg-gray-700/g, 'hover:bg-accent'],
  [/hover:bg-gray-100\s+dark:hover:bg-gray-600/g, 'hover:bg-accent'],
  [/hover:bg-gray-200\s+dark:hover:bg-gray-600/g, 'hover:bg-accent'],
  [/hover:bg-gray-200\s+dark:hover:bg-gray-700/g, 'hover:bg-accent'],
  [/(?<!\S)hover:bg-gray-50(?!\s+dark:)(?=[\s"'`}])/g, 'hover:bg-accent'],
  [/(?<!\S)hover:bg-gray-100(?!\s+dark:)(?=[\s"'`}])/g, 'hover:bg-accent'],
  [/(?<!\S)hover:bg-gray-200(?!\s+dark:)(?=[\s"'`}])/g, 'hover:bg-accent'],

  // === BLUE BUTTONS → PRIMARY ===
  [/bg-blue-600\s+text-white/g, 'bg-primary text-primary-foreground'],
  [/hover:bg-blue-700/g, 'hover:bg-primary/90'],
  [/bg-blue-600(?!\s)/g, 'bg-primary'],
  [/bg-blue-500(?!\s)/g, 'bg-primary'],
  [/text-blue-600(?!\s)/g, 'text-primary'],
  [/text-blue-500(?!\s)/g, 'text-primary'],
  [/hover:text-blue-600\s+dark:hover:text-blue-400/g, 'hover:text-primary'],
  [/hover:text-blue-500/g, 'hover:text-primary'],
  [/hover:bg-blue-50\s+dark:hover:bg-gray-700/g, 'hover:bg-primary/10'],
  [/hover:bg-blue-100/g, 'hover:bg-primary/10'],
  [/bg-blue-50\s+border-blue-500\s+text-blue-600/g, 'bg-primary/10 border-primary text-primary'],
  [/focus:ring-blue-500/g, 'focus:ring-ring'],
  [/focus:ring-blue-600/g, 'focus:ring-ring'],
  [/ring-blue-500/g, 'ring-ring'],
  [/disabled:bg-blue-400/g, 'disabled:bg-primary/60'],

  // === RED/DESTRUCTIVE ===
  [/bg-red-100\s+dark:bg-red-900\/50/g, 'bg-destructive/10'],
  [/text-red-600\s+dark:text-red-400/g, 'text-destructive'],
  [/hover:text-red-600\s+dark:hover:text-red-400/g, 'hover:text-destructive'],
  [/hover:bg-red-50\s+dark:hover:bg-gray-700/g, 'hover:bg-destructive/10'],
  [/bg-red-600\s+text-white/g, 'bg-destructive text-destructive-foreground'],
  [/hover:bg-red-700/g, 'hover:bg-destructive/90'],
  [/(?<!\S)text-red-500(?!\s+dark:)(?=[\s"'`}])/g, 'text-destructive'],
  [/(?<!\S)text-red-600(?!\s+dark:)(?=[\s"'`}])/g, 'text-destructive'],
  [/(?<!\S)border-red-500(?!\s+dark:)(?=[\s"'`}])/g, 'border-destructive'],
  [/focus:ring-red-500/g, 'focus:ring-destructive'],

  // === GREEN/SUCCESS ===
  [/text-green-600\s+dark:text-green-400/g, 'text-success'],
  [/text-green-500\s+dark:text-green-400/g, 'text-success'],
  [/bg-green-50\s+dark:bg-green-900\/20/g, 'bg-success/10'],
  [/hover:bg-green-100\s+dark:hover:bg-green-900\/40/g, 'hover:bg-success/20'],
  [/border-green-200\s+dark:border-green-800/g, 'border-success/30'],

  // === INDIGO → PRIMARY (for HomePage) ===
  [/text-indigo-500\s+dark:text-indigo-400/g, 'text-primary'],
  [/hover:text-indigo-500\s+dark:hover:text-indigo-400/g, 'hover:text-primary'],
  [/bg-indigo-600\s+hover:bg-indigo-700\s+text-white/g, 'bg-primary hover:bg-primary/90 text-primary-foreground'],
  [/bg-indigo-600\s+text-white/g, 'bg-primary text-primary-foreground'],
  [/hover:bg-indigo-500\s+dark:hover:bg-indigo-400/g, 'hover:bg-primary/80'],
  [/bg-indigo-100\s+dark:bg-indigo-900\/50/g, 'bg-primary/10'],
  [/text-indigo-600\s+dark:text-indigo-400/g, 'text-primary'],
  [/text-indigo-800\s+dark:text-indigo-300/g, 'text-primary'],
  [/bg-indigo-100\s+text-indigo-800\s+dark:bg-indigo-900\/50\s+dark:text-indigo-300/g, 'bg-primary/10 text-primary'],
  [/hover:border-indigo-500/g, 'hover:border-primary'],
  [/hover:bg-gray-50\s+dark:hover:bg-gray-700/g, 'hover:bg-accent'],
  [/focus:ring-indigo-500/g, 'focus:ring-ring'],
  [/(?<!\S)bg-indigo-600(?!\s)(?=[\s"'`}])/g, 'bg-primary'],
  [/(?<!\S)bg-indigo-500(?!\s)(?=[\s"'`}])/g, 'bg-primary'],
  [/(?<!\S)text-indigo-500(?!\s)(?=[\s"'`}])/g, 'text-primary'],
  [/hover:bg-indigo-400/g, 'hover:bg-primary/80'],

  // === RING/FOCUS ===
  [/focus:ring-2\s+focus:ring-blue-500\s+focus:border-transparent/g, 'focus:ring-2 focus:ring-ring focus:border-transparent'],

  // === MISC GRAY BACKGROUNDS ===
  [/bg-gray-200\s+dark:bg-gray-700\s+hover:bg-gray-300\s+dark:hover:bg-gray-600/g, 'bg-muted hover:bg-muted/80'],
  [/bg-gray-700\/50\s+dark:bg-gray-800\/50/g, 'bg-foreground/50'],
  [/(?<!\S)bg-gray-800(?!\s+dark:)(?=[\s"'`}])/g, 'bg-foreground/90'],

  // === SHADOW-BASED ON INLINE ===
  [/disabled:bg-gray-400/g, 'disabled:bg-muted-foreground'],

  // Clean up any remaining standalone dark: prefixes for colors we already replaced
  // dark:bg-gray-800 (orphaned)
  [/\s+dark:bg-gray-800(?=[\s"'`}])/g, ''],
  [/\s+dark:bg-gray-900(?=[\s"'`}])/g, ''],
  [/\s+dark:bg-gray-700(?=[\s"'`}])/g, ''],
  [/\s+dark:bg-gray-600(?=[\s"'`}])/g, ''],
  [/\s+dark:text-gray-100(?=[\s"'`}])/g, ''],
  [/\s+dark:text-gray-200(?=[\s"'`}])/g, ''],
  [/\s+dark:text-gray-300(?=[\s"'`}])/g, ''],
  [/\s+dark:text-gray-400(?=[\s"'`}])/g, ''],
  [/\s+dark:text-gray-500(?=[\s"'`}])/g, ''],
  [/\s+dark:text-white(?=[\s"'`}])/g, ''],
  [/\s+dark:border-gray-600(?=[\s"'`}])/g, ''],
  [/\s+dark:border-gray-700(?=[\s"'`}])/g, ''],
  [/\s+dark:border-gray-800(?=[\s"'`}])/g, ''],
  [/\s+dark:divide-gray-700(?=[\s"'`}])/g, ''],
  [/\s+dark:hover:bg-gray-600(?=[\s"'`}])/g, ''],
  [/\s+dark:hover:bg-gray-700(?=[\s"'`}])/g, ''],
  [/\s+dark:hover:text-white(?=[\s"'`}])/g, ''],
  [/\s+dark:hover:text-foreground(?=[\s"'`}])/g, ''],
  [/\s+dark:bg-gray-300(?=[\s"'`}])/g, ''],
  [/\s+dark:bg-gray-900\/50(?=[\s"'`}])/g, ''],
  
  // Handle bg-gray-900/80 dark:bg-gray-900/80 patterns for homepage header
  [/bg-white\/80\s+dark:bg-gray-900\/80/g, 'bg-background/80'],

  // Fix remaining specific patterns
  [/bg-gray-100\s+dark:bg-gray-800\/50/g, 'bg-muted'],
];

const files = getAllFiles(FRONTEND_SRC);
let totalChanges = 0;

for (const file of files) {
  // Skip PDFs and receipt files - they need specific print colors
  if (file.includes('ReceiptPDF') || file.includes('FacturePDF') || file.includes('ServiceReceiptPDF')) {
    continue;
  }

  let content = readFileSync(file, 'utf8');
  const original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    totalChanges++;
    console.log(`Updated: ${file.replace(FRONTEND_SRC + '/', '')}`);
  }
}

console.log(`\nDone! Updated ${totalChanges} files.`);
