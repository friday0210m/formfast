import postgres from 'postgres';
import * as schema from './schema.js';
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
export declare function initDatabase(): Promise<void>;
//# sourceMappingURL=db.d.ts.map