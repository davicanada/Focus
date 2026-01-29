import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail, sendWelcomeEmail, sendAccessRequestNotification, sendOccurrenceNotification } from '@/lib/email/sendVerificationEmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, type, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Destinatário obrigatório' },
        { status: 400 }
      );
    }

    let result = false;

    switch (type) {
      case 'welcome':
        // Test welcome email with sample credentials
        result = await sendWelcomeEmail(
          to,
          'Usuário Teste',
          'SenhaTemp123ABC'
        );
        break;

      case 'access-request':
        // Test access request notification
        result = await sendAccessRequestNotification(
          to,
          'Maria Silva',
          'professor'
        );
        break;

      case 'occurrence':
        // Test occurrence notification
        result = await sendOccurrenceNotification(
          to,
          'João Pedro Santos',
          'Atraso',
          'media'
        );
        break;

      default:
        // Default test email
        result = await sendTestEmail(to, message);
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Email enviado com sucesso',
        type: type || 'test'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Falha ao enviar email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test email:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
