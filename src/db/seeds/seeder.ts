// T031: Abstract DataSeeder class
import type { DatabaseAdapter } from '../adapter';

export abstract class DataSeeder {
  abstract getName(): string;
  abstract shouldRun(db: DatabaseAdapter): Promise<boolean>;
  abstract seed(db: DatabaseAdapter): Promise<number>;
}
