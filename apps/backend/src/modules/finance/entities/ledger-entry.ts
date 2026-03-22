export interface LedgerEntry {
  accountType: 'merchant' | 'courier' | 'customer' | 'platform';
  accountId: string;
  direction: 'credit' | 'debit';
  amount: number;
  entryType:
    | 'order_gmv'
    | 'delivery_fee'
    | 'platform_commission'
    | 'merchant_payout'
    | 'courier_earning'
    | 'cashback'
    | 'refund';
  orderId?: string;
  metadata?: Record<string, unknown>;
}
