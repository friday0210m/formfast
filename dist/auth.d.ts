export declare function sendEmailCode(email: string): Promise<void>;
export declare function verifyEmailCode(email: string, code: string): Promise<boolean>;
export declare function handleGoogleAuth(token: string): Promise<{
    email: string;
    sub: string;
} | null>;
//# sourceMappingURL=auth.d.ts.map