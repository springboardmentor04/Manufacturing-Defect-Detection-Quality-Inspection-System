export const NAV_SCROLL_THRESHOLD = 18;

export function hasScrolledPastHeader(scrollY) {
  return scrollY > NAV_SCROLL_THRESHOLD;
}
