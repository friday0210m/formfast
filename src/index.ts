import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './db.js';
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
    
    const result = await db.insertForms({
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
  } catch (error: any) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Failed to create form', details: error.message });
  }
});

// Submit to a form (public endpoint)
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
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form || form.api_key !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const data = await db.selectSubmissions(formId);
    
    res.json({ 
      submissions: data.map((s: any) => ({
        ...s,
        data: s.data,
      }))
    });
  } catch (error: any) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Delete form
app.delete('/api/forms/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form || form.api_key !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    await db.deleteForm(formId);
    res.json({ success: true, message: 'Form deleted' });
  } catch (error: any) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form', details: error.message });
  }
});

// Update form name
app.patch('/api/forms/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const { name } = req.body;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const forms = await db.selectForms({ id: formId });
    const form = forms[0];
    
    if (!form || form.api_key !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    await db.updateForm(formId, { name });
    res.json({ success: true, message: 'Form updated', name });
  } catch (error: any) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Failed to update form', details: error.message });
  }
});

// Payment
app.post('/api/checkout', async (req, res) => {
  try {
    const { formId, apiKey } = req.body;
    
    if (!formId || !apiKey) {
      return res.status(400).json({ error: 'formId and apiKey required' });
    }
    
    const session = await createCheckoutSession(formId, apiKey);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
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
