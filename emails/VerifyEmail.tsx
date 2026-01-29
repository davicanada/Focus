// Email template for React Email - to be used with Resend
// This is a placeholder template that can be customized

import * as React from 'react';

interface VerifyEmailProps {
  name: string;
  email: string;
  tempPassword?: string;
  type: 'welcome' | 'access_request' | 'occurrence';
}

export function VerifyEmail({ name, email, tempPassword, type }: VerifyEmailProps) {
  if (type === 'welcome') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#1e3a5f', padding: '20px', textAlign: 'center' as const }}>
          <h1 style={{ color: 'white', margin: 0 }}>Focus</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0' }}>
            Sistema de Gestao Escolar
          </p>
        </div>

        <div style={{ padding: '30px', backgroundColor: '#f5f5f5' }}>
          <h2 style={{ color: '#1e3a5f' }}>Bem-vindo, {name}!</h2>
          <p>Sua solicitacao de acesso ao Focus foi aprovada.</p>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px 0'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e3a5f' }}>Suas credenciais:</h3>
            <p style={{ margin: '5px 0' }}><strong>Email:</strong> {email}</p>
            {tempPassword && (
              <p style={{ margin: '5px 0' }}><strong>Senha temporaria:</strong> {tempPassword}</p>
            )}
          </div>

          <p style={{ color: '#666' }}>
            Por favor, altere sua senha apos o primeiro login por motivos de seguranca.
          </p>

          <a
            href={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
            style={{
              display: 'inline-block',
              backgroundColor: '#1e3a5f',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              marginTop: '20px'
            }}
          >
            Acessar o Sistema
          </a>
        </div>

        <div style={{ padding: '20px', textAlign: 'center' as const, color: '#666', fontSize: '14px' }}>
          <p>Focus - Sistema de Gestao Escolar</p>
        </div>
      </div>
    );
  }

  return null;
}

export default VerifyEmail;
