import Stripe from 'stripe';
import { db } from './db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover' as any,
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PRICE_ID = process.env.STRIPE_PRICE_ID || ''; // Pro plan price ID

// Create checkout session for subscription
export async function createCheckoutSession(userEmail: string) {
  // Get or create user
  let user = await db.getUserByEmail(userEmail);
  if (!user) {
    await db.createUser({ email: userEmail });
    user = await db.getUserByEmail(userEmail);
  }
  
  // Create Stripe customer if not exists
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
    });
    customerId = customer.id;
    await db.updateUserSubscription(userEmail, {
      subscriptionStatus: 'free',
      stripeCustomerId: customerId,
    });
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICE_ID || undefined,
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    metadata: {
      userEmail,
    },
  });
  
  return session;
}

// Handle Stripe webhook
export async function handleWebhook(payload: Buffer, signature: string): Promise<void> {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
  
  console.log('Webhook event:', event.type);
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.metadata?.userEmail;
      
      if (userEmail) {
        await db.updateUserSubscription(userEmail, {
          subscriptionStatus: 'pro',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        });
        console.log(`✅ User ${userEmail} upgraded to Pro`);
      }
      break;
    }
    
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      // This requires adding a lookup function to db.ts
      const status = subscription.status === 'active' ? 'pro' : 'free';
      
      console.log(`Subscription ${subscription.id} status: ${status}`);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// Create customer portal session
export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/account`,
  });
  
  return session;
}

export { stripe };
