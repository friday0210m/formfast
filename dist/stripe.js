import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover',
});
export { stripe };
// 创建结账会话
export async function createCheckoutSession(formId, apiKey) {
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'cny',
                    product_data: {
                        name: 'FormFast Pro',
                        description: '无限表单提交 + Webhook 集成',
                    },
                    unit_amount: 4900, // ¥49/月
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            },
        ],
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        metadata: {
            formId,
            apiKey,
        },
    });
    return session;
}
//# sourceMappingURL=stripe.js.map