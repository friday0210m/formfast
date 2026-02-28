import Stripe from 'stripe';
declare const stripe: Stripe;
export declare function createCheckoutSession(userEmail: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
export declare function handleWebhook(payload: Buffer, signature: string): Promise<void>;
export declare function createPortalSession(customerId: string): Promise<Stripe.Response<Stripe.BillingPortal.Session>>;
export { stripe };
//# sourceMappingURL=stripe.d.ts.map