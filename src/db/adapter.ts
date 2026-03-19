// T018: Abstract DatabaseAdapter class

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
}

export abstract class DatabaseAdapter {
  abstract execute(sql: string, params?: unknown[]): Promise<void>;
  abstract query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  abstract getTableNames(): Promise<string[]>;
  abstract getColumnInfo(table: string): Promise<ColumnInfo[]>;
  abstract transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
  abstract close(): Promise<void>;
}
