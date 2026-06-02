import { Pool } from 'pg';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

/**
 * Reset the FAQ table to a clean state with test data.
 * Invitations/RSVPs/invitees are read-only archives — not touched here.
 */
export async function resetDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });

  try {
    await pool.query('DELETE FROM faqs');
    await pool.query(
      `INSERT INTO faqs (id, question, answer)
       VALUES
         ('test-faq-1', 'What time is the ceremony?', 'The ceremony starts at 4pm.'),
         ('test-faq-2', 'Where is the venue?', 'Gran Villa Rosa, Vilanova i la Geltrú, Spain.')`
    );
  } finally {
    await pool.end();
  }
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
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });

  try {
    let sql = `SELECT * FROM ${params.table}`;
    const values: string[] = [];

    if (params.column && params.value) {
      sql += ` WHERE ${params.column} = $1`;
      values.push(params.value);
    }

    sql += ' LIMIT 1';
    const { rows } = await pool.query(sql, values);
    return rows[0] ?? null;
  } finally {
    await pool.end();
  }
}
