/** MoveMatch commission on a finished job (see /terms, section 3). Amounts in whole shekels. */
export const COMMISSION_RATE = 0.1;
export const VAT_RATE = 0.18;

export const commissionOf = (finalPrice: number) => Math.round(finalPrice * COMMISSION_RATE);
/** Commission including VAT: what the mover actually pays. */
export const commissionDue = (finalPrice: number) => Math.round(commissionOf(finalPrice) * (1 + VAT_RATE));
export const nis = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
