import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmailVerificationLink } from '@/lib/email/sendVerificationEmail';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      full_name,
      phone,
      request_type,
      institution_id,
      // New institution fields with full address
      institution_name,
      institution_full_address,
      institution_street,
      institution_number,
      institution_neighborhood,
      institution_city,
      institution_state,
      institution_state_code,
      institution_postal_code,
      institution_country,
      institution_latitude,
      institution_longitude,
      message,
    } = body;

    // Validation
    if (!email || !full_name || !request_type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if email already has a pending request
    const { data: existingRequest } = await supabase
      .from('access_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para este email' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Build insert data based on request type
    const insertData: Record<string, unknown> = {
      email,
      full_name,
      phone,
      request_type,
      message,
      status: 'pending_verification',
      verification_token: verificationToken,
      verification_sent_at: new Date().toISOString(),
    };

    if (request_type === 'admin_new') {
      // New institution with full address data
      insertData.institution_name = institution_name;
      insertData.institution_full_address = institution_full_address;
      insertData.institution_street = institution_street;
      insertData.institution_number = institution_number;
      insertData.institution_neighborhood = institution_neighborhood;
      insertData.institution_city = institution_city;
      insertData.institution_state = institution_state;
      insertData.institution_state_code = institution_state_code;
      insertData.institution_postal_code = institution_postal_code;
      insertData.institution_country = institution_country;
      insertData.institution_latitude = institution_latitude;
      insertData.institution_longitude = institution_longitude;
    } else {
      // Existing institution
      insertData.institution_id = institution_id;
    }

    // Create access request
    const { data, error } = await supabase
      .from('access_requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating access request:', error);
      return NextResponse.json(
        { error: 'Erro ao criar solicitação' },
        { status: 500 }
      );
    }

    // Send verification email (non-blocking - don't fail the request if email fails)
    try {
      await sendEmailVerificationLink(email, full_name, verificationToken);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      // Log but don't fail the request
      console.error('Error sending verification email:', emailError);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in access request:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const institutionId = searchParams.get('institution_id');

    const supabase = createServiceClient();

    let query = supabase
      .from('access_requests')
      .select(`
        *,
        institution:institutions(id, name, city, state)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar solicitações' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in get access requests:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
