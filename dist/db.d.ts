import postgres from 'postgres';
declare const client: postgres.Sql<{}>;
export { client };
export declare const db: {
    insertForms(data: any): Promise<postgres.RowList<postgres.Row[]>>;
    selectForms(where?: any): Promise<postgres.RowList<postgres.Row[]>>;
    insertSubmissions(data: any): Promise<postgres.RowList<postgres.Row[]>>;
    selectSubmissions(formId: string): Promise<postgres.RowList<postgres.Row[]>>;
};
export declare function initDatabase(): Promise<void>;
//# sourceMappingURL=db.d.ts.map