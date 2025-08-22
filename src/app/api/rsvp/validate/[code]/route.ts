import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Check if the RSVP code exists in the RSVPs table
    const { data, error } = await supabase
      .from('RSVPs')
      .select('id, short_url')
      .eq('short_url', code.toUpperCase())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'RSVP code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      valid: true, 
      rsvpId: data.id,
      code: data.short_url 
    });

  } catch (error) {
    console.error('Error validating RSVP code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
