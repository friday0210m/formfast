import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './db.js';
import { createCheckoutSession, handleWebhook } from './stripe.js';
import { sendEmailCode, verifyEmailCode, handleGoogleAuth } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== AUTH ROUTES ==========

// Send email verification code
app.post('/api/auth/email/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    
    await sendEmailCode(email);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    console.error('Send code error:', error);
    res.status(500).json({ error: 'Failed to send code', details: error.message });
  }
});

// Verify email code and login
app.post('/api/auth/email/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }
    
    const isValid = await verifyEmailCode(email, code);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    
    // Create or get user
    await db.createUser({ email });
    const user = await db.getUserByEmail(email);
    
    res.json({
      success: true,
      user: {
        email: user.email,
        subscriptionStatus: user.subscription_status,
      }
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

// Google OAuth
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google token required' });
    }
    
    const googleUser = await handleGoogleAuth(token);
    if (!googleUser) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    
    // Create or get user
    await db.createUser({ 
      email: googleUser.email, 
      googleId: googleUser.sub 
    });
    const user = await db.getUserByEmail(googleUser.email);
    
    res.json({
      success: true,
      user: {
        email: user.email,
        subscriptionStatus: user.subscription_status,
      }
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google auth failed', details: error.message });
  }
});

// Get current user
app.get('/api/me', async (req, res) => {
  try {
    const email = req.headers['x-user-email'] as string;
    if (!email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Count user's forms
    const formCount = await db.countFormsByUser(email);
    
    res.json({
      email: user.email,
      subscriptionStatus: user.subscription_status,
      formCount,
      maxForms: user.subscription_status === 'pro' ? 100 : 3,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
});

// ========== FORM ROUTES ==========

// Create a new form
app.post('/api/forms', async (req, res) => {
  try {
    const { name, allowedOrigins = ['*'] } = req.body;
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Please login first' });
    }
    
    // Check user's subscription and form limit
    const user = await db.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const formCount = await db.countFormsByUser(userEmail);
    const maxForms = user.subscription_status === 'pro' ? 100 : 3;
    
    if (formCount >= maxForms) {
      return res.status(403).json({ 
        error: 'Form limit reached',
        message: user.subscription_status === 'pro' 
          ? 'You have reached the maximum number of forms (100)'
          : 'Free users can only create 3 forms. Please upgrade to Pro.',
        upgradeRequired: user.subscription_status !== 'pro'
      });
    }
    
    const formId = nanoid(12);
    const apiKey = nanoid(32);
    
    await db.insertForms({
      id: formId,
      name,
      apiKey,
      allowedOrigins,
      userEmail,
    });
    
    res.json({
      id: formId,
      name,
      apiKey,
      endpoint: `/f/${formId}`,
    });
  } catch (error: any) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Failed to create form', details: error.message });
  }
});

// Get user's forms
app.get('/api/forms', async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(401).json({ error: 'Please login first' });
    }
    
    const forms = await db.selectForms({ userEmail });
    res.json({ forms });
  } catch (error: any) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Failed to get forms', details: error.message });
  }
});

// Submit to a form (public endpoint - no auth required)
app.post('/f/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    const origin = req.headers.origin || req.headers.referer || '';
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const allowedOrigins = form.allowed_origins as string[];
    if (!allowedOrigins.includes('*')) {
      const isAllowed = allowedOrigins.some((allowed: string) => 
        origin.includes(allowed)
      );
      if (!isAllowed) {
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }
    
    const submissionId = nanoid(16);
    await db.insertSubmissions({
      id: submissionId,
      formId,
      data: req.body,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    
    res.json({ 
      success: true, 
      message: 'Submission received',
      id: submissionId,
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit', details: error.message });
  }
});

// Get form submissions
app.get('/api/forms/:formId/submissions', async (req, res) => {
  try {
    const { formId } = req.params;
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Please login first' });
    }
    
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form || form.user_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const data = await db.selectSubmissions(formId);
    res.json({ submissions: data });
  } catch (error: any) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Update form
app.patch('/api/forms/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const { name } = req.body;
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Please login first' });
    }
    
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form || form.user_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.updateForm(formId, { name });
    res.json({ success: true, message: 'Form updated', name });
  } catch (error: any) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Failed to update form', details: error.message });
  }
});

// Delete form
app.delete('/api/forms/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Please login first' });
    }
    
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form || form.user_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.deleteForm(formId);
    res.json({ success: true, message: 'Form deleted' });
  } catch (error: any) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form', details: error.message });
  }
});

// ========== SUBSCRIPTION ROUTES ==========

// Create checkout session
app.post('/api/checkout', async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(401).json({ error: 'Please login first' });
    }
    
    const session = await createCheckoutSession(userEmail);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout', details: error.message });
  }
});

// Stripe webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await handleWebhook(req.body, req.headers['stripe-signature'] as string);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook failed', details: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 FormFast API running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to get started`);
  
  initDatabase().catch(err => {
    console.error('❌ Database initialization failed:', err);
  });
});
