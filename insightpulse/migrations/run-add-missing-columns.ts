import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const statements = [
  `ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_phone VARCHAR(30)`,
  `ALTER TABLE feedback_analytics ALTER COLUMN evi_score DROP NOT NULL`,
  `ALTER TABLE feedback_analytics ALTER COLUMN nps_score DROP NOT NULL`,
  `ALTER TABLE feedback_analytics ALTER COLUMN csat_score DROP NOT NULL`,
  `ALTER TABLE feedback_analytics ALTER COLUMN emotions DROP NOT NULL`,
  `ALTER TABLE feedback_analytics ALTER COLUMN insights DROP NOT NULL`,
  `ALTER TABLE feedback_analytics ALTER COLUMN recommendations DROP NOT NULL`,
  `ALTER TABLE structured_outputs ADD COLUMN IF NOT EXISTS nps_score INTEGER`,
  `ALTER TABLE structured_outputs ADD COLUMN IF NOT EXISTS ces_score INTEGER`,
  `ALTER TABLE structured_outputs ADD COLUMN IF NOT EXISTS evi_score INTEGER`,
];

for (const stmt of statements) {
  try {
    await db.execute(sql.raw(stmt));
    console.log('✓', stmt);
  } catch (e: any) {
    console.error('✗', stmt, '->', e.message);
  }
}
console.log('Migration complete.');
process.exit(0);
