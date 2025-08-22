import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: Fetch RSVP data and invitees
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid RSVP code format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the RSVP record
    const { data: rsvpData, error: rsvpError } = await supabase
      .from('RSVPs')
      .select('id, invitation_id')
      .eq('short_url', code.toUpperCase())
      .single();

    if (rsvpError || !rsvpData) {
      return NextResponse.json(
        { error: 'RSVP code not found' },
        { status: 404 }
      );
    }

    // Get invitees for this invitation
    const { data: invitees, error: inviteesError } = await supabase
      .from('invitees')
      .select('id, first_name, last_name')
      .eq('invitation_id', rsvpData.invitation_id);

    if (inviteesError) {
      console.error('Error fetching invitees:', inviteesError);
      return NextResponse.json(
        { error: 'Failed to fetch invitees' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rsvpId: rsvpData.id,
      invitationId: rsvpData.invitation_id,
      invitees: invitees || []
    });

  } catch (error) {
    console.error('Error fetching RSVP data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Submit RSVP form
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid RSVP code format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the RSVP record
    const { data: rsvpData, error: rsvpError } = await supabase
      .from('RSVPs')
      .select('id')
      .eq('short_url', code.toUpperCase())
      .single();

    if (rsvpError || !rsvpData) {
      return NextResponse.json(
        { error: 'RSVP code not found' },
        { status: 404 }
      );
    }

    // Update the RSVP record with form data
    const { error: updateError } = await supabase
      .from('RSVPs')
      .update({
        coming: body.coming,
        own_accomodation: body.own_accomodation,
        dietary_restrictions: body.dietary_restrictions || null,
        song_request: body.song_request || null,
        travel_plans: body.travel_plans || null,
        message: body.message || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', rsvpData.id);

    if (updateError) {
      console.error('Error updating RSVP:', updateError);
      return NextResponse.json(
        { error: 'Failed to update RSVP' },
        { status: 500 }
      );
    }

    // Update individual invitee attendance if provided
    if (body.invitees && body.invitees.length > 0) {
      for (const invitee of body.invitees) {
        const { error: inviteeError } = await supabase
          .from('invitees')
          .update({
            coming: invitee.coming,
            updated_at: new Date().toISOString()
          })
          .eq('id', invitee.id);

        if (inviteeError) {
          console.error('Error updating invitee:', inviteeError);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'RSVP submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting RSVP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
