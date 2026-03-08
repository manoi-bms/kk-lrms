// T022: QueryBuilder — type-safe SQL builder with driver-specific placeholders

type Driver = 'sqlite' | 'postgresql';
type Operator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';

interface WhereClause {
  type: 'condition' | 'null' | 'in';
  column: string;
  operator?: Operator;
  value?: unknown;
  values?: unknown[];
}

interface JoinClause {
  type: string;
  table: string;
  on: string;
}

type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export class QueryBuilder {
  private queryType: QueryType;
  private tableName: string;
  private columns: string[];
  private whereClauses: WhereClause[] = [];
  private joinClauses: JoinClause[] = [];
  private orderByClause: { column: string; direction: 'ASC' | 'DESC' } | null = null;
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private insertData: Record<string, unknown> | null = null;
  private updateData: Record<string, unknown> | null = null;

  private constructor(type: QueryType, table: string, columns: string[] = []) {
    this.queryType = type;
    this.tableName = table;
    this.columns = columns;
  }

  static select(table: string, columns?: string[]): QueryBuilder {
    return new QueryBuilder('SELECT', table, columns ?? []);
  }

  static insert(table: string, data: Record<string, unknown>): QueryBuilder {
    const qb = new QueryBuilder('INSERT', table);
    qb.insertData = data;
    return qb;
  }

  static update(table: string, data: Record<string, unknown>): QueryBuilder {
    const qb = new QueryBuilder('UPDATE', table);
    qb.updateData = data;
    return qb;
  }

  static delete(table: string): QueryBuilder {
    return new QueryBuilder('DELETE', table);
  }

  where(column: string, operator: Operator, value: unknown): QueryBuilder {
    this.whereClauses.push({ type: 'condition', column, operator, value });
    return this;
  }

  whereNull(column: string): QueryBuilder {
    this.whereClauses.push({ type: 'null', column, operator: 'IS NULL' });
    return this;
  }

  whereIn(column: string, values: unknown[]): QueryBuilder {
    this.whereClauses.push({ type: 'in', column, values });
    return this;
  }

  join(type: string, table: string, on: string): QueryBuilder {
    this.joinClauses.push({ type, table, on });
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = { column, direction };
    return this;
  }

  limit(n: number): QueryBuilder {
    this.limitValue = n;
    return this;
  }

  offset(n: number): QueryBuilder {
    this.offsetValue = n;
    return this;
  }

  getParams(): unknown[] {
    const params: unknown[] = [];

    if (this.queryType === 'INSERT' && this.insertData) {
      params.push(...Object.values(this.insertData));
    }

    if (this.queryType === 'UPDATE' && this.updateData) {
      params.push(...Object.values(this.updateData));
    }

    for (const clause of this.whereClauses) {
      if (clause.type === 'condition') {
        params.push(clause.value);
      } else if (clause.type === 'in' && clause.values) {
        params.push(...clause.values);
      }
    }

    return params;
  }

  toSql(driver: Driver): string {
    switch (this.queryType) {
      case 'SELECT':
        return this.buildSelect(driver);
      case 'INSERT':
        return this.buildInsert(driver);
      case 'UPDATE':
        return this.buildUpdate(driver);
      case 'DELETE':
        return this.buildDelete(driver);
    }
  }

  private placeholder(driver: Driver, index: number): string {
    return driver === 'postgresql' ? `$${index}` : '?';
  }

  private buildSelect(driver: Driver): string {
    const cols = this.columns.length > 0 ? this.columns.join(', ') : '*';
    let sql = `SELECT ${cols} FROM ${this.tableName}`;

    for (const j of this.joinClauses) {
      sql += ` ${j.type} ${j.table} ON ${j.on}`;
    }

    sql += this.buildWhere(driver);

    if (this.orderByClause) {
      sql += ` ORDER BY ${this.orderByClause.column} ${this.orderByClause.direction}`;
    }

    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return sql;
  }

  private buildInsert(driver: Driver): string {
    if (!this.insertData) throw new Error('No data for INSERT');
    const keys = Object.keys(this.insertData);
    let idx = 1;
    const placeholders = keys.map(() => this.placeholder(driver, idx++));
    return `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`;
  }

  private buildUpdate(driver: Driver): string {
    if (!this.updateData) throw new Error('No data for UPDATE');
    const keys = Object.keys(this.updateData);
    let idx = 1;
    const sets = keys.map((k) => `${k} = ${this.placeholder(driver, idx++)}`);
    let sql = `UPDATE ${this.tableName} SET ${sets.join(', ')}`;
    sql += this.buildWhere(driver, idx);
    return sql;
  }

  private buildDelete(driver: Driver): string {
    let sql = `DELETE FROM ${this.tableName}`;
    sql += this.buildWhere(driver);
    return sql;
  }

  private buildWhere(driver: Driver, startIdx: number = 1): string {
    if (this.whereClauses.length === 0) return '';

    // Calculate starting index from insert/update data
    let idx = startIdx;
    if (this.queryType === 'INSERT' && this.insertData) {
      idx += Object.keys(this.insertData).length;
    } else if (this.queryType === 'UPDATE' && this.updateData) {
      // For update, startIdx already accounts for SET params
    }

    const parts: string[] = [];
    for (const clause of this.whereClauses) {
      if (clause.type === 'null') {
        parts.push(`${clause.column} ${clause.operator}`);
      } else if (clause.type === 'in' && clause.values) {
        const placeholders = clause.values.map(() => this.placeholder(driver, idx++));
        parts.push(`${clause.column} IN (${placeholders.join(', ')})`);
      } else if (clause.type === 'condition') {
        parts.push(`${clause.column} ${clause.operator} ${this.placeholder(driver, idx++)}`);
      }
    }

    return ` WHERE ${parts.join(' AND ')}`;
  }
}
