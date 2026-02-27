import Stripe from 'stripe';
declare const stripe: Stripe;
export { stripe };
export declare function createCheckoutSession(formId: string, apiKey: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
//# sourceMappingURL=stripe.d.ts.map