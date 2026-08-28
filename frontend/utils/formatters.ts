/**
 * Utility functions for formatting defect classifications and metrics for UI display.
 */

const MVTEC_CATEGORIES = [
  'bottle', 'cable', 'capsule', 'carpet', 'grid', 'hazelnut',
  'leather', 'metal_nut', 'pill', 'screw', 'tile', 'toothbrush',
  'transistor', 'wood', 'zipper'
];

/**
 * Format raw defect types into clean human-readable titles.
 * Examples:
 * - 'broken_large' -> 'Broken Large'
 * - 'bottle_broken_large' -> 'Broken Large'
 * - 'bent_wire' -> 'Bent Wire'
 * - 'scratch' -> 'Scratch'
 * - 'hole' -> 'Hole'
 * - 'contamination' -> 'Contamination'
 */
export function formatDefectType(defectType?: string | null): string {
  if (!defectType) return '';
  let clean = defectType.trim().replace(/[-_]+/g, '_');
  const lower = clean.toLowerCase();
  if (!lower || ['no_defect', 'none', 'pass', 'normal'].includes(lower)) return '';

  // If defectType has an MVTec category prefix (e.g. 'bottle_broken_large'), strip it
  for (const cat of MVTEC_CATEGORIES) {
    if (lower.startsWith(`${cat}_`) && lower.length > cat.length + 1) {
      clean = clean.slice(cat.length + 1);
      break;
    }
  }

  // Capitalize each word
  return clean
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}


