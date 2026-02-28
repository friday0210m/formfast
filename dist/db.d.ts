import postgres from 'postgres';
declare const client: postgres.Sql<{}>;
export { client };
export declare const db: {
    createUser(data: {
        email: string;
        googleId?: string;
        stripeCustomerId?: string;
    }): Promise<postgres.RowList<postgres.Row[]>>;
    getUserByEmail(email: string): Promise<postgres.Row>;
    getUserByGoogleId(googleId: string): Promise<postgres.Row>;
    updateUserSubscription(email: string, data: {
        subscriptionStatus: string;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
    }): Promise<postgres.RowList<postgres.Row[]>>;
    insertForms(data: any): Promise<postgres.RowList<postgres.Row[]>>;
    selectForms(where?: any): Promise<postgres.RowList<postgres.Row[]>>;
    countFormsByUser(userEmail: string): Promise<number>;
    deleteForm(formId: string): Promise<postgres.RowList<postgres.Row[]>>;
    updateForm(formId: string, data: {
        name?: string;
    }): Promise<postgres.Row | undefined>;
    insertSubmissions(data: any): Promise<postgres.RowList<postgres.Row[]>>;
    selectSubmissions(formId: string): Promise<postgres.RowList<postgres.Row[]>>;
    createAuthCode(data: {
        email: string;
        code: string;
    }): Promise<postgres.RowList<postgres.Row[]>>;
    verifyAuthCode(email: string, code: string): Promise<boolean>;
};
export declare function initDatabase(): Promise<void>;
//# sourceMappingURL=db.d.ts.map