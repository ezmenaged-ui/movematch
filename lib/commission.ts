/** MoveMatch commission on a finished job (see /movers/terms, section 6). The final price is what the client paid after the ₪50 discount, before VAT. Amounts in whole shekels. */
export const COMMISSION_RATE = 0.1;
export const VAT_RATE = 0.18;

export const commissionOf = (finalPrice: number) => Math.round(finalPrice * COMMISSION_RATE);
/** Commission including VAT: what the mover actually pays. */
export const commissionDue = (finalPrice: number) => Math.round(commissionOf(finalPrice) * (1 + VAT_RATE));
export const nis = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
