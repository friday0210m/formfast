import { db } from './db.js';
// Send email verification code
export async function sendEmailCode(email) {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in database
    await db.createAuthCode({ email, code });
    // In production, send actual email here
    // For now, log to console (for testing)
    console.log(`📧 Verification code for ${email}: ${code}`);
    // TODO: Integrate with email service like SendGrid, Resend, or AWS SES
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'FormFast <noreply@formfast.io>',
    //   to: email,
    //   subject: 'Your FormFast verification code',
    //   html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`
    // });
}
// Verify email code
export async function verifyEmailCode(email, code) {
    return await db.verifyAuthCode(email, code);
}
// Handle Google OAuth token
export async function handleGoogleAuth(token) {
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
    }
    catch (error) {
        console.error('Google auth error:', error);
        return null;
    }
}
//# sourceMappingURL=auth.js.map