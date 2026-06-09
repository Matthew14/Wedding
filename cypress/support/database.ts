import { Pool } from 'pg';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

let pool: Pool | undefined;

function getPool(): Pool {
  pool ??= new Pool({ connectionString: TEST_DATABASE_URL });
  return pool;
}

/**
 * Reset the FAQ table to a clean state with test data.
 * Invitations/RSVPs/invitees are read-only archives — not touched here.
 */
export async function resetDatabase(): Promise<void> {
  const p = getPool();
  await p.query('DELETE FROM faqs');
  await p.query(
    `INSERT INTO faqs (id, question, answer)
     VALUES
       ('test-faq-1', 'What time is the ceremony?', 'The ceremony starts at 4pm.'),
       ('test-faq-2', 'Where is the venue?', 'Gran Villa Rosa, Vilanova i la Geltrú, Spain.')`
  );
}

interface DatabaseRecord {
  id: number | string;
  [key: string]: unknown;
}

export async function queryDatabase(params: {
  table: string;
  column?: string;
  value?: string;
}): Promise<DatabaseRecord | null> {
  const p = getPool();
  let sql = `SELECT * FROM ${params.table}`;
  const values: string[] = [];

  if (params.column && params.value) {
    sql += ` WHERE ${params.column} = $1`;
    values.push(params.value);
  }

  sql += ' LIMIT 1';
  const { rows } = await p.query(sql, values);
  return rows[0] ?? null;
}
