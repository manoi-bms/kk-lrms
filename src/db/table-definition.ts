// T017: TableDefinition type system for schema-sync

export type AbstractFieldType =
  | 'uuid'
  | 'string'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'datetime'
  | 'json'
  | 'string[]';

export interface FieldDefinition {
  name: string;
  type: AbstractFieldType;
  maxLength?: number; // For string(N)
  nullable?: boolean; // Default: false
  defaultValue?: string | number | boolean | null;
  unique?: boolean;
  primaryKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface TableDefinition {
  name: string;
  fields: FieldDefinition[];
  indexes?: IndexDefinition[];
}
