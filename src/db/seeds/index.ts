// T034: Seed orchestrator — register and run seeders in order
import type { DatabaseAdapter } from '../adapter';
import { DataSeeder } from './seeder';
import { HospitalSeeder } from './hospital-seeder';
import { AdminSeeder } from './admin-seeder';

export class SeedOrchestrator {
  private seeders: DataSeeder[];

  constructor(seeders?: DataSeeder[]) {
    this.seeders = seeders ?? [new HospitalSeeder(), new AdminSeeder()];
  }

  async run(db: DatabaseAdapter): Promise<void> {
    for (const seeder of this.seeders) {
      const shouldRun = await seeder.shouldRun(db);
      if (shouldRun) {
        const count = await seeder.seed(db);
        console.log(`${seeder.getName()}: seeded ${count} records`);
      } else {
        console.log(`${seeder.getName()}: skipped (already seeded)`);
      }
    }
  }
}

export { HospitalSeeder, AdminSeeder };
