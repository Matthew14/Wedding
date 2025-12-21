import { createClient } from '@supabase/supabase-js';

// Local Supabase TEST instance credentials (separate from dev instance)
// Uses port 54421 instead of 54321 to run alongside dev
const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Reset database to clean state and reseed with test data.
 * Throws an error if any database operation fails to prevent tests from
 * proceeding with corrupted or stale data.
 */
export async function resetDatabase(): Promise<void> {
  const errors: string[] = [];

  // Delete data in reverse order of dependencies to avoid FK constraint violations
  const { error: deleteInviteesError } = await supabase.from('invitees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteInviteesError) {
    errors.push(`Error deleting invitees: ${deleteInviteesError.message}`);
  }

  const { error: deleteRsvpsError } = await supabase.from('RSVPs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteRsvpsError) {
    errors.push(`Error deleting RSVPs: ${deleteRsvpsError.message}`);
  }

  const { error: deleteInvitationError } = await supabase.from('invitation').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteInvitationError) {
    errors.push(`Error deleting invitations: ${deleteInvitationError.message}`);
  }

  const { error: deleteFaqsError } = await supabase.from('FAQs').delete().neq('id', '___never___');
  if (deleteFaqsError) {
    errors.push(`Error deleting FAQs: ${deleteFaqsError.message}`);
  }

  // Delete test auth users
  const { data: users, error: listUsersError } = await supabase.auth.admin.listUsers();
  if (!listUsersError && users?.users) {
    for (const user of users.users) {
      if (user.email?.endsWith('@wedding.test')) {
        await supabase.auth.admin.deleteUser(user.id);
      }
    }
  }

  // Fail fast if cleanup failed - don't attempt to seed with stale data
  if (errors.length > 0) {
    throw new Error(`Database reset failed during cleanup:\n${errors.join('\n')}`);
  }

  // Reseed database by executing inserts via Supabase client
  // Note: Column "isMatthewSide" is case-sensitive in PostgreSQL (quoted identifier)
  
  // Insert test invitation
  const { error: inv1Error } = await supabase.from('invitation').insert({
    id: '11111111-1111-1111-1111-111111111111',
    "isMatthewSide": true,
  });
  if (inv1Error) {
    errors.push(`Error inserting invitation 1: ${inv1Error.message}`);
  }

  // Insert test RSVP with code TEST01
  const { error: rsvp1Error } = await supabase.from('RSVPs').insert({
    id: '22222222-2222-2222-2222-222222222222',
    invitation_id: '11111111-1111-1111-1111-111111111111',
    short_url: 'TEST01',
    accepted: null,
    staying_villa: null,
    dietary_restrictions: null,
    song_request: null,
    travel_plans: null,
    message: null,
  });
  if (rsvp1Error) {
    errors.push(`Error inserting RSVP 1: ${rsvp1Error.message}`);
  }

  // Insert test invitees
  const { error: inviteesError } = await supabase.from('invitees').insert([
    {
      id: '33333333-3333-3333-3333-333333333333',
      invitation_id: '11111111-1111-1111-1111-111111111111',
      first_name: 'John',
      last_name: 'Doe',
      coming: null,
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      invitation_id: '11111111-1111-1111-1111-111111111111',
      first_name: 'Jane',
      last_name: 'Doe',
      coming: null,
    },
  ]);
  if (inviteesError) {
    errors.push(`Error inserting invitees: ${inviteesError.message}`);
  }

  // Insert test FAQ
  const { error: faqError } = await supabase.from('FAQs').insert({
    id: 'test-faq-1',
    question: 'What time is the ceremony?',
    answer: 'The ceremony starts at 4pm.',
  });
  if (faqError) {
    errors.push(`Error inserting FAQ: ${faqError.message}`);
  }

  // Insert second test invitation and RSVP
  const { error: inv2Error } = await supabase.from('invitation').insert({
    id: '55555555-5555-5555-5555-555555555555',
    "isMatthewSide": false,
  });
  if (inv2Error) {
    errors.push(`Error inserting invitation 2: ${inv2Error.message}`);
  }

  const { error: rsvp2Error } = await supabase.from('RSVPs').insert({
    id: '66666666-6666-6666-6666-666666666666',
    invitation_id: '55555555-5555-5555-5555-555555555555',
    short_url: 'TEST02',
    accepted: null,
    staying_villa: null,
  });
  if (rsvp2Error) {
    errors.push(`Error inserting RSVP 2: ${rsvp2Error.message}`);
  }

  const { error: invitee3Error } = await supabase.from('invitees').insert({
    id: '77777777-7777-7777-7777-777777777777',
    invitation_id: '55555555-5555-5555-5555-555555555555',
    first_name: 'Alice',
    last_name: 'Smith',
    coming: null,
  });
  if (invitee3Error) {
    errors.push(`Error inserting invitee 3: ${invitee3Error.message}`);
  }

  // Create test auth user
  const { error: authUserError } = await supabase.auth.admin.createUser({
    email: 'admin@wedding.test',
    password: 'TestPassword123!',
    email_confirm: true,
  });
  if (authUserError) {
    errors.push(`Error creating auth user: ${authUserError.message}`);
  }

  // Throw if any seeding operations failed
  if (errors.length > 0) {
    throw new Error(`Database reset failed during seeding:\n${errors.join('\n')}`);
  }
}

interface DatabaseRecord {
  id: string;
  [key: string]: unknown;
}

/**
 * Query database for verification in tests
 */
export async function queryDatabase(params: {
  table: string;
  code?: string;
  id?: string;
}): Promise<DatabaseRecord | null> {
  try {
    let query = supabase.from(params.table).select('*');

    if (params.code) {
      query = query.eq('short_url', params.code);
    }

    if (params.id) {
      query = query.eq('id', params.id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Database query error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to query database:', error);
    throw error;
  }
}

/**
 * Query multiple rows from database
 */
export async function queryDatabaseMultiple(params: {
  table: string;
  column?: string;
  value?: string;
}): Promise<DatabaseRecord[]> {
  try {
    let query = supabase.from(params.table).select('*');

    if (params.column && params.value) {
      query = query.eq(params.column, params.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to query database:', error);
    throw error;
  }
}
