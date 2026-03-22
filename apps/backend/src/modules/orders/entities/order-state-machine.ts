export const orderStates = {
  draft: ['pricing_validated', 'cancelled_by_customer'],
  pricing_validated: ['payment_pending', 'cancelled_by_customer'],
  payment_pending: ['placed', 'cancelled_by_customer'],
  placed: ['merchant_received', 'rejected_by_merchant', 'cancelled_by_platform'],
  merchant_received: ['preparing', 'cancelled_by_platform'],
  preparing: ['ready_for_pickup', 'cancelled_by_platform'],
  ready_for_pickup: ['courier_assigned', 'in_delivery', 'cancelled_by_platform'],
  courier_assigned: ['picked_up', 'failed_delivery', 'cancelled_by_platform'],
  picked_up: ['in_delivery', 'failed_delivery'],
  in_delivery: ['delivered', 'failed_delivery'],
  delivered: [],
  rejected_by_merchant: [],
  cancelled_by_customer: [],
  cancelled_by_platform: [],
  failed_delivery: ['refunded'],
  refunded: [],
} as const;

export type OrderState = keyof typeof orderStates;

export function canTransition(from: OrderState, to: string): boolean {
  return orderStates[from].includes(to as never);
}
