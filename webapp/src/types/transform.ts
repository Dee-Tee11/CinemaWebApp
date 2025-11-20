/**
 * Transform Types
 * 
 * Type definitions for scroll and animation transformations.
 */

/**
 * Transform properties for card animations in ScrollStack
 */
export interface CardTransform {
    translateY: number;
    scale: number;
    rotation: number;
    blur: number;
}

/**
 * Type for card transform cache (used in Map)
 */
export type CardTransformCache = Map<number, CardTransform>;

/**
 * Scroll data information
 */
export interface ScrollData {
    scrollTop: number;
    containerHeight: number;
    scrollContainer: HTMLElement;
}
