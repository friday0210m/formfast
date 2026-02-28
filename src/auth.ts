import { db } from './db.js';
import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Send email verification code
export async function sendEmailCode(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in database
    await db.createAuthCode({ email, code });
    
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      // Fallback: log to console for debugging
      console.log(`📧 Verification code for ${email}: ${code}`);
      return { success: false, error: 'Email service not configured' };
    }
    
    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'FormFast <onboarding@resend.dev>',
      to: email,
      subject: 'Your FormFast verification code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">FormFast</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 8px;">${code}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">FormFast - Simple form backend for developers</p>
        </div>
      `,
    });
    
    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Verification email sent to ${email}, messageId: ${data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Send email code error:', error);
    return { success: false, error: error.message };
  }
}

// Verify email code
export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  return await db.verifyAuthCode(email, code);
}

// Handle Google OAuth token
export async function handleGoogleAuth(token: string): Promise<{ email: string; sub: string } | null> {
  try {
    // Verify Google token
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Verify client ID matches
    if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
      console.error('Google client ID mismatch');
      return null;
    }
    
    return {
      email: data.email,
      sub: data.sub,
    };
  } catch (error) {
    console.error('Google auth error:', error);
    return null;
  }
}
