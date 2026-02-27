import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { forms, submissions } from './schema.js';
import { eq } from 'drizzle-orm';
import { createCheckoutSession } from './stripe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a new form
app.post('/api/forms', async (req, res) => {
  try {
    const { name, allowedOrigins = ['*'] } = req.body;
    
    const formId = nanoid(12);
    const apiKey = nanoid(32);
    
    await db.insert(forms).values({
      id: formId,
      name,
      apiKey,
      allowedOrigins,
    });
    
    res.json({
      id: formId,
      name,
      apiKey,
      endpoint: `/f/${formId}`,
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// Submit to a form (public endpoint)
app.post('/f/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    // Check origin
    const origin = req.headers.origin || req.headers.referer || '';
    const formResult = await db.select().from(forms).where(eq(forms.id, formId)).limit(1);
    const form = formResult[0];
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Check allowed origins
    const allowedOrigins = form.allowedOrigins as string[];
    if (!allowedOrigins.includes('*')) {
      const isAllowed = allowedOrigins.some((allowed: string) => 
        origin.includes(allowed)
      );
      if (!isAllowed) {
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }
    
    // Save submission
    const submissionId = nanoid(16);
    await db.insert(submissions).values({
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
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

// Get form submissions (protected by API key)
app.get('/api/forms/:formId/submissions', async (req, res) => {
  try {
    const { formId } = req.params;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const formResult = await db.select().from(forms).where(eq(forms.id, formId)).limit(1);
    const form = formResult[0];
    
    if (!form || form.apiKey !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const data = await db.select().from(submissions)
      .where(eq(submissions.formId, formId));
    
    res.json({ submissions: data });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Payment: Create checkout session
app.post('/api/checkout', async (req, res) => {
  try {
    const { formId, apiKey } = req.body;
    
    if (!formId || !apiKey) {
      return res.status(400).json({ error: 'formId and apiKey required' });
    }
    
    const session = await createCheckoutSession(formId, apiKey);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
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
});
