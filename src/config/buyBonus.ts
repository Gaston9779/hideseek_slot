/** V4 presentation gate; price is the independently calculated math configuration, never UI-owned. */
import {BUY_BONUS as MATH_BUY} from '../math/v4/config';
export const BUY_BONUS={feature:'CHEST_BONUS' as const,mathValidated:MATH_BUY.enabled,priceX:MATH_BUY.priceX};
