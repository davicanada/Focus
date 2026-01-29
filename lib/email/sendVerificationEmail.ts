// Email sending utilities with Nodemailer + Gmail SMTP
import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Sender email address
const FROM_EMAIL = `Focus <${process.env.GMAIL_USER}>`;

// Common email styles
const EMAIL_STYLES = {
  primaryColor: '#1e3a5f',
  primaryGradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)',
  successColor: '#10b981',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
  textColor: '#374151',
  mutedColor: '#6b7280',
  bgColor: '#f3f4f6',
  cardBg: '#ffffff',
  borderColor: '#e5e7eb',
};

// Focus Logo component using pure HTML/CSS (works in ALL email clients including Gmail)
// Design: Escudo com Lupa e F - Logo oficial Focus
function focusLogo(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="vertical-align: middle; padding-right: 14px;">
          <!-- Focus Logo - Escudo com Lupa e F -->
          <div style="position: relative; width: 52px; height: 52px; background-color: #2d3a5f; border-radius: 50%;">
            <!-- Escudo (simplificado com bordas) -->
            <div style="position: absolute; top: 10px; left: 12px; width: 28px; height: 32px; border: 2px solid #ffffff; border-radius: 0 0 14px 14px; box-sizing: border-box;"></div>
            <!-- Lupa circulo -->
            <div style="position: absolute; top: 14px; left: 18px; width: 16px; height: 16px; border: 2px solid #ffffff; border-radius: 50%; box-sizing: border-box;"></div>
            <!-- Lupa cabo -->
            <div style="position: absolute; top: 28px; left: 32px; width: 8px; height: 2px; background-color: #ffffff; transform: rotate(45deg);"></div>
            <!-- Letra F -->
            <div style="position: absolute; top: 18px; left: 24px; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #ffffff;">F</div>
            <!-- Linhas de dados -->
            <div style="position: absolute; top: 34px; left: 16px; width: 16px; height: 2px; background-color: #ffffff; border-radius: 1px;"></div>
            <div style="position: absolute; top: 38px; left: 18px; width: 12px; height: 2px; background-color: #ffffff; border-radius: 1px;"></div>
          </div>
        </td>
        <td style="vertical-align: middle;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Focus</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500;">Gestao Escolar</p>
        </td>
      </tr>
    </table>
  `;
}

// Alternative logo using table-based approach (maximum compatibility)
// Design: Escudo com Lupa e F - versao tabela para Outlook
function focusLogoTable(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="vertical-align: middle; padding-right: 16px;">
          <!-- Badge circular azul -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 52px; height: 52px; background-color: #2d3a5f; border-radius: 26px;">
            <tr>
              <td align="center" valign="middle" style="padding: 8px;">
                <!-- Escudo simplificado -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 32px; height: 36px; border: 2px solid #ffffff; border-radius: 0 0 16px 16px;">
                  <tr>
                    <td align="center" valign="top" style="padding-top: 4px;">
                      <!-- Lupa -->
                      <div style="width: 14px; height: 14px; border: 2px solid #ffffff; border-radius: 50%; margin: 0 auto; text-align: center; line-height: 12px; font-family: Arial; font-size: 8px; font-weight: bold; color: #ffffff;">F</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 2px;">
                      <!-- Linhas -->
                      <div style="width: 18px; height: 2px; background-color: #ffffff; margin: 2px auto;"></div>
                      <div style="width: 14px; height: 2px; background-color: #ffffff; margin: 2px auto;"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
        <td style="vertical-align: middle;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Focus</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500;">Gestao Escolar</p>
        </td>
      </tr>
    </table>
  `;
}

// Reusable email wrapper template
function emailWrapper(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Focus - Sistema de Gestão Escolar</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_STYLES.bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${EMAIL_STYLES.textColor};">
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${EMAIL_STYLES.bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Email Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%); padding: 32px 40px; text-align: center; border-radius: 16px 16px 0 0;">
              ${focusLogoTable()}
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: ${EMAIL_STYLES.cardBg}; padding: 40px; border-left: 1px solid ${EMAIL_STYLES.borderColor}; border-right: 1px solid ${EMAIL_STYLES.borderColor};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-radius: 0 0 16px 16px; border: 1px solid ${EMAIL_STYLES.borderColor}; border-top: none;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">
                Este email foi enviado automaticamente pelo Focus.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Focus - Sistema de Gestão Escolar
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Button component
function emailButton(text: string, url: string, color: string = EMAIL_STYLES.primaryColor): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto;">
  <tr>
    <td style="background-color: ${color}; border-radius: 8px;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;
}

// Info box component
function infoBox(content: string, bgColor: string = '#f0f9ff', borderColor: string = '#0ea5e9'): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; padding: 20px 24px;">
      ${content}
    </td>
  </tr>
</table>
`;
}

// Credential box component
function credentialBox(email: string, password: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid ${EMAIL_STYLES.borderColor}; border-radius: 12px;">
  <tr>
    <td style="padding: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${EMAIL_STYLES.mutedColor}; text-transform: uppercase; letter-spacing: 0.5px;">Suas Credenciais</p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
            <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Email</span><br>
            <span style="font-size: 15px; font-weight: 600; color: ${EMAIL_STYLES.textColor};">${email}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Senha Temporária</span><br>
            <code style="display: inline-block; margin-top: 4px; padding: 8px 16px; background-color: #1e3a5f; color: #ffffff; font-size: 16px; font-weight: 600; border-radius: 6px; letter-spacing: 1px;">${password}</code>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  console.log('Sending email via Gmail SMTP:', { to: options.to, subject: options.subject });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
    console.warn('Gmail credentials not configured. Email not sent.');
    console.log('Email would be sent:', { to: options.to, subject: options.subject });
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html || '',
      text: options.text || '',
    });

    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  tempPassword: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Bem-vindo ao Focus! 🎉
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Olá <strong>${name}</strong>, sua solicitação de acesso foi aprovada!
    </p>

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #0369a1;">
        <strong style="color: #0c4a6e;">✓ Acesso Aprovado</strong><br>
        Você agora pode acessar o sistema Focus com as credenciais abaixo.
      </p>
    `, '#f0f9ff', '#0ea5e9')}

    ${credentialBox(email, tempPassword)}

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #b45309;">
        <strong style="color: #92400e;">⚠️ Importante</strong><br>
        Por segurança, altere sua senha após o primeiro login.
      </p>
    `, '#fffbeb', '#f59e0b')}

    ${emailButton('Acessar o Sistema', appUrl, EMAIL_STYLES.primaryColor)}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Se você não solicitou acesso ao Focus, ignore esta mensagem.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: '🎓 Bem-vindo ao Focus - Suas credenciais de acesso',
    html: emailWrapper(content, 'Sua solicitação de acesso foi aprovada! Confira suas credenciais.'),
    text: `Bem-vindo ao Focus, ${name}!\n\nSua solicitação de acesso foi aprovada.\n\nCredenciais:\nEmail: ${email}\nSenha temporária: ${tempPassword}\n\nPor favor, altere sua senha após o primeiro login.\n\nAcesse: ${appUrl}`,
  });
}

export async function sendAccessRequestNotification(
  adminEmail: string,
  requesterName: string,
  requestType: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const typeLabels: Record<string, string> = {
    'admin_new': 'Administrador (Nova Instituição)',
    'admin_existing': 'Administrador (Instituição Existente)',
    'professor': 'Professor',
  };

  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    'admin_new': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    'admin_existing': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    'professor': { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  };

  const colors = typeColors[requestType] || typeColors['professor'];

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Nova Solicitação de Acesso 📋
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Uma nova solicitação de acesso foi recebida.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid ${EMAIL_STYLES.borderColor}; border-radius: 12px;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Solicitante</span><br>
                <span style="font-size: 17px; font-weight: 600; color: ${EMAIL_STYLES.textColor};">${requesterName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Tipo de Acesso</span><br>
                <span style="display: inline-block; margin-top: 6px; padding: 6px 12px; background-color: ${colors.bg}; color: ${colors.text}; font-size: 13px; font-weight: 600; border-radius: 20px; border: 1px solid ${colors.border};">
                  ${typeLabels[requestType] || requestType}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailButton('Revisar Solicitação', `${appUrl}/master`, EMAIL_STYLES.primaryColor)}
  `;

  return sendEmail({
    to: adminEmail,
    subject: '📋 Nova solicitação de acesso - Focus',
    html: emailWrapper(content, `${requesterName} solicitou acesso como ${typeLabels[requestType] || requestType}`),
    text: `Nova solicitação de acesso no Focus!\n\n${requesterName} solicitou acesso como ${typeLabels[requestType] || requestType}.\n\nAcesse o painel master para revisar: ${appUrl}/master`,
  });
}

export async function sendOccurrenceNotification(
  adminEmail: string,
  studentName: string,
  occurrenceType: string,
  severity: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const severityConfig: Record<string, { bg: string; border: string; text: string; label: string; emoji: string }> = {
    'leve': { bg: '#d1fae5', border: '#10b981', text: '#065f46', label: 'LEVE', emoji: '🟢' },
    'media': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'MÉDIA', emoji: '🟡' },
    'grave': { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', label: 'GRAVE', emoji: '🔴' },
  };

  const config = severityConfig[severity] || severityConfig['media'];

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Nova Ocorrência Registrada ${config.emoji}
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Uma nova ocorrência foi registrada no sistema.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid ${EMAIL_STYLES.borderColor}; border-radius: 12px;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Aluno</span><br>
                <span style="font-size: 17px; font-weight: 600; color: ${EMAIL_STYLES.textColor};">${studentName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Tipo de Ocorrência</span><br>
                <span style="font-size: 15px; font-weight: 500; color: ${EMAIL_STYLES.textColor};">${occurrenceType}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Severidade</span><br>
                <span style="display: inline-block; margin-top: 6px; padding: 6px 14px; background-color: ${config.bg}; color: ${config.text}; font-size: 12px; font-weight: 700; border-radius: 20px; border: 1px solid ${config.border}; letter-spacing: 0.5px;">
                  ${config.label}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailButton('Ver Detalhes', `${appUrl}/admin`, EMAIL_STYLES.primaryColor)}
  `;

  return sendEmail({
    to: adminEmail,
    subject: `${config.emoji} Ocorrência ${config.label} - ${studentName}`,
    html: emailWrapper(content, `Nova ocorrência ${severity} registrada para ${studentName}`),
    text: `Nova ocorrência registrada no Focus!\n\nAluno: ${studentName}\nTipo: ${occurrenceType}\nSeveridade: ${severity}\n\nAcesse o sistema para mais detalhes: ${appUrl}/admin`,
  });
}

export async function sendRequestConfirmationEmail(
  email: string,
  name: string,
  requestType: string,
  institutionName?: string
): Promise<boolean> {
  const typeLabels: Record<string, string> = {
    'admin_new': 'Administrador de Nova Instituição',
    'admin_existing': 'Administrador',
    'professor': 'Professor',
  };

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Solicitação Recebida! 📬
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Olá <strong>${name}</strong>, recebemos sua solicitação de acesso ao Focus.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid ${EMAIL_STYLES.borderColor}; border-radius: 12px;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Tipo de Acesso Solicitado</span><br>
                <span style="font-size: 15px; font-weight: 600; color: ${EMAIL_STYLES.textColor};">${typeLabels[requestType] || requestType}</span>
              </td>
            </tr>
            ${institutionName ? `
            <tr>
              <td style="padding: 12px 0;">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Instituição</span><br>
                <span style="font-size: 15px; font-weight: 600; color: ${EMAIL_STYLES.textColor};">${institutionName}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #0369a1;">
        <strong style="color: #0c4a6e;">⏳ Em Análise</strong><br>
        Sua solicitação será analisada por um administrador. Você receberá um email quando for aprovada.
      </p>
    `, '#f0f9ff', '#0ea5e9')}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Se você não fez esta solicitação, ignore esta mensagem.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: '📬 Solicitação de Acesso Recebida - Focus',
    html: emailWrapper(content, 'Sua solicitação de acesso ao Focus foi recebida e está em análise.'),
    text: `Olá ${name}!\n\nRecebemos sua solicitação de acesso ao Focus como ${typeLabels[requestType] || requestType}${institutionName ? ` para ${institutionName}` : ''}.\n\nSua solicitação será analisada por um administrador. Você receberá um email quando for aprovada.`,
  });
}

export async function sendEmailVerificationLink(
  email: string,
  name: string,
  verificationToken: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/api/verify-email?token=${verificationToken}`;

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Confirme seu Email 📧
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Olá <strong>${name}</strong>, para continuar com sua solicitação de acesso ao Focus, precisamos confirmar seu email.
    </p>

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #0369a1;">
        <strong style="color: #0c4a6e;">📌 Importante</strong><br>
        Clique no botão abaixo para verificar seu email. Após a verificação, sua solicitação será enviada para análise.
      </p>
    `, '#f0f9ff', '#0ea5e9')}

    ${emailButton('Verificar Meu Email', verificationUrl, EMAIL_STYLES.successColor)}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Se o botão não funcionar, copie e cole este link no seu navegador:
    </p>
    <p style="margin: 8px 0 0 0; font-size: 12px; color: ${EMAIL_STYLES.mutedColor}; text-align: center; word-break: break-all;">
      <a href="${verificationUrl}" style="color: ${EMAIL_STYLES.primaryColor};">${verificationUrl}</a>
    </p>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Se você não fez esta solicitação, ignore esta mensagem.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: '📧 Confirme seu Email - Focus',
    html: emailWrapper(content, 'Clique no link para confirmar seu email e continuar com a solicitação de acesso.'),
    text: `Olá ${name}!\n\nPara continuar com sua solicitação de acesso ao Focus, confirme seu email clicando no link abaixo:\n\n${verificationUrl}\n\nApós a verificação, sua solicitação será enviada para análise.\n\nSe você não fez esta solicitação, ignore esta mensagem.`,
  });
}

export async function sendTestEmail(to: string, message?: string): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Email de Teste ✉️
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      ${message || 'Este é um email de teste do sistema Focus.'}
    </p>

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        <strong style="color: #047857;">✓ Configuração OK</strong><br>
        O Nodemailer com Gmail SMTP está funcionando corretamente!
      </p>
    `, '#d1fae5', '#10b981')}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
    </p>
  `;

  return sendEmail({
    to,
    subject: '✅ Teste de Email - Focus',
    html: emailWrapper(content, 'Email de teste do sistema Focus'),
    text: message || 'Este é um email de teste do sistema Focus. O Nodemailer com Gmail SMTP está funcionando corretamente!',
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Redefinir Senha 🔐
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Olá <strong>${name}</strong>, recebemos uma solicitação para redefinir a senha da sua conta no Focus.
    </p>

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong style="color: #78350f;">⏰ Link expira em 1 hora</strong><br>
        Por segurança, este link de redefinição expira em 1 hora. Após esse período, você precisará solicitar um novo link.
      </p>
    `, '#fef3c7', '#f59e0b')}

    ${emailButton('Redefinir Minha Senha', resetUrl, EMAIL_STYLES.successColor)}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Se o botão não funcionar, copie e cole este link no seu navegador:
    </p>
    <p style="margin: 8px 0 0 0; font-size: 12px; color: ${EMAIL_STYLES.mutedColor}; text-align: center; word-break: break-all;">
      <a href="${resetUrl}" style="color: ${EMAIL_STYLES.primaryColor};">${resetUrl}</a>
    </p>

    ${infoBox(`
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong style="color: #7f1d1d;">🔒 Não solicitou essa alteração?</strong><br>
        Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá a mesma.
      </p>
    `, '#fef2f2', '#ef4444')}
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Redefinir Senha - Focus',
    html: emailWrapper(content, 'Clique no link para redefinir sua senha do Focus.'),
    text: `Olá ${name}!\n\nRecebemos uma solicitação para redefinir a senha da sua conta no Focus.\n\nClique no link abaixo para criar uma nova senha:\n\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe você não solicitou essa alteração, ignore este email. Sua senha permanecerá a mesma.`,
  });
}

// Send alert notification email
export async function sendAlertEmail(
  email: string,
  name: string,
  ruleName: string,
  alertMessage: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${EMAIL_STYLES.primaryColor};">
      Alerta de Monitoramento 🔔
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textColor};">
      Olá <strong>${name}</strong>, uma regra de alerta foi disparada.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border: 1px solid ${EMAIL_STYLES.borderColor}; border-radius: 12px;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${EMAIL_STYLES.borderColor};">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Regra</span><br>
                <span style="font-size: 17px; font-weight: 600; color: ${EMAIL_STYLES.textColor};">${ruleName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="font-size: 13px; color: ${EMAIL_STYLES.mutedColor};">Mensagem</span><br>
                <span style="font-size: 15px; color: ${EMAIL_STYLES.textColor};">${alertMessage}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailButton('Ver Alertas', `${appUrl}/admin/alertas`, EMAIL_STYLES.primaryColor)}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: ${EMAIL_STYLES.mutedColor}; text-align: center;">
      Você pode gerenciar suas regras de alerta em Configurações > Regras de Alerta.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `🔔 Alerta: ${ruleName} - Focus`,
    html: emailWrapper(content, `A regra "${ruleName}" foi disparada: ${alertMessage}`),
    text: `Olá ${name}!\n\nUma regra de alerta foi disparada no Focus.\n\nRegra: ${ruleName}\nMensagem: ${alertMessage}\n\nAcesse o sistema para ver detalhes: ${appUrl}/admin/alertas`,
  });
}
