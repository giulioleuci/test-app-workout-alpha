/**
 * Converts pixels to rems based on a 16px base font size.
 */
export function pxToRem(px: number): string {
  return `${px / 16}rem`;
}
