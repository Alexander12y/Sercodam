const { google } = require('googleapis');
const logger = require('../config/logger');
const CotizacionPdfServiceV2 = require('./cotizacionPdfServiceV2');

class CotizacionEmailService {
  constructor() {
    this.gmail = this.getGmailClient();
    this.pdfService = CotizacionPdfServiceV2;
  }

  /**
   * Configurar cliente Gmail con OAuth2
   */
  getGmailClient() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/oauth2callback'
    );

    if (process.env.GOOGLE_REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Generar el contenido del email en formato MIME
   */
  createEmailContent(to, subject, body, pdfBuffer, fileName) {
    const boundary = 'boundary_' + Math.random().toString(36).substring(2);
    
    const emailContent = [
      `To: ${to}`,
      `From: ${process.env.GMAIL_FROM || 'sercodamxbuddify@gmail.com'}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      '',
      `--${boundary}`,
      'Content-Type: application/pdf',
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${fileName}"`,
      '',
      pdfBuffer.toString('base64'),
      '',
      `--${boundary}--`
    ].join('\r\n');

    return Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Generar el HTML del email
   */
  generateEmailHTML(cotizacion, cliente) {
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotización ${cotizacion.numero_cotizacion}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #CE0A0A;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 8px 8px;
          }
          .footer {
            margin-top: 20px;
            padding: 15px;
            background-color: #f0f0f0;
            border-radius: 8px;
            font-size: 14px;
            color: #666;
          }
          .highlight {
            color: #CE0A0A;
            font-weight: bold;
          }
          .button {
            display: inline-block;
            background-color: #CE0A0A;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sercodam</h1>
          <p>Redes de Protección Industrial</p>
        </div>
        
        <div class="content">
          <h2>Estimado/a ${cliente.nombre_cliente || 'Cliente'},</h2>
          
          <p>Esperamos que este mensaje le encuentre bien. Adjunto encontrará la cotización solicitada para su proyecto:</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #CE0A0A; margin-top: 0;">Cotización ${cotizacion.numero_cotizacion}</h3>
            <p><strong>Proyecto:</strong> ${cotizacion.titulo_proyecto}</p>
            <p><strong>Tipo:</strong> ${cotizacion.tipo_proyecto}</p>
            <p><strong>Total:</strong> <span class="highlight">$${cotizacion.total?.toLocaleString('es-MX') || '0.00'}</span></p>
            <p><strong>Válida hasta:</strong> ${cotizacion.valido_hasta ? new Date(cotizacion.valido_hasta).toLocaleDateString('es-MX') : '15 días'}</p>
          </div>
          
          <p>Esta cotización incluye todos los detalles técnicos, especificaciones y condiciones de nuestro servicio. Si tiene alguna pregunta o requiere modificaciones, no dude en contactarnos.</p>
          
          <p>Para proceder con el proyecto, puede:</p>
          <ul>
            <li>Revisar la cotización adjunta</li>
            <li>Contactarnos para aclarar cualquier duda</li>
            <li>Confirmar su aceptación para proceder con la orden de producción</li>
          </ul>
          
          <p>Estamos a su disposición para cualquier consulta adicional.</p>
          
          <p>Saludos cordiales,<br>
          <strong>Equipo Sercodam</strong></p>
        </div>
        
        <div class="footer">
          <p><strong>Sercodam</strong> - Redes de Protección Industrial</p>
          <p>📧 ${process.env.GMAIL_FROM || 'sercodamxbuddify@gmail.com'}</p>
          <p>📱 +52 55 1234 5678</p>
          <p>🌐 www.sercodam.com</p>
          <p style="font-size: 12px; margin-top: 15px;">
            Este es un email automático generado por el sistema de cotizaciones de Sercodam.
            Fecha de envío: ${fecha}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Enviar cotización por email
   */
  async sendCotizacionEmail(cotizacion, cliente, detalle = []) {
    try {
      logger.info(`📧 Iniciando envío de cotización ${cotizacion.numero_cotizacion} a ${cliente.email_cliente}`);

      // Generar PDF
      logger.info('📄 Generando PDF de la cotización...');
      const pdfBuffer = await this.pdfService.generateCotizacionPDF(cotizacion, detalle);
      
      // Preparar datos del email
      const subject = `Cotización ${cotizacion.numero_cotizacion} - ${cotizacion.titulo_proyecto}`;
      const fileName = `Cotizacion_${cotizacion.numero_cotizacion}_${cotizacion.titulo_proyecto.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      // Generar HTML del email
      const emailHTML = this.generateEmailHTML(cotizacion, cliente);
      
      // Crear contenido MIME
      const emailContent = this.createEmailContent(
        cliente.email_cliente,
        subject,
        emailHTML,
        pdfBuffer,
        fileName
      );

      // Enviar email
      logger.info('📤 Enviando email...');
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: emailContent
        }
      });

      logger.info(`✅ Email enviado exitosamente. Message ID: ${response.data.id}`);
      
      return {
        success: true,
        messageId: response.data.id,
        sentTo: cliente.email_cliente,
        subject: subject
      };

    } catch (error) {
      logger.error('❌ Error enviando email de cotización:', error);
      throw new Error(`Error enviando email: ${error.message}`);
    }
  }

  /**
   * Verificar configuración de Gmail
   */
  async testGmailConnection() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      logger.info(`✅ Conexión Gmail exitosa. Email: ${response.data.emailAddress}`);
      return {
        success: true,
        email: response.data.emailAddress
      };
    } catch (error) {
      logger.error('❌ Error verificando conexión Gmail:', error);
      throw new Error(`Error de conexión Gmail: ${error.message}`);
    }
  }
}

module.exports = new CotizacionEmailService(); 