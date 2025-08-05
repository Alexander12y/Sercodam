const { google } = require('googleapis');
const logger = require('../config/logger');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

// Configurar cliente OAuth2
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  // Si tenemos refresh token, úsalo
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

class GmailService {
  constructor() {
    this.gmail = getGmailClient();
  }

  /**
   * Buscar emails con filtros específicos
   */
  async searchEmails(query, maxResults = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      if (!response.data.messages) {
        return [];
      }

      const emails = [];
      
      for (const message of response.data.messages) {
        if (message.id) {
          const emailData = await this.getEmailById(message.id);
          if (emailData) {
            emails.push(emailData);
          }
        }
      }

      return emails;
    } catch (error) {
      logger.error('❌ Error searching emails:', error);
      throw error;
    }
  }

  /**
   * Obtener email específico por ID
   */
  async getEmailById(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      if (!message.payload) return null;

      const headers = message.payload.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extraer el cuerpo del email
      let body = '';
      if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload.parts) {
        // Buscar en las partes del email
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      }

      return {
        messageId,
        subject,
        from,
        body,
        date: new Date(date),
        headers,
        threadId: message.threadId,
        labelIds: message.labelIds || []
      };
    } catch (error) {
      logger.error('❌ Error getting email:', error);
      return null;
    }
  }

  /**
   * Buscar emails de Sercodam con filtros específicos
   */
  async getSercodamEmails() {
    const queries = [
      'to:sercodamxbuddify@gmail.com subject:"Contacto desde landing page"',
      'to:sercodamxbuddify@gmail.com subject:"Cotización Nueva (Buddify)"',
      'to:sercodamxbuddify@gmail.com subject:"Nuevo Contacto"',
      'to:sercodamxbuddify@gmail.com subject:"Solicitud de Cotización"',
      'to:sercodamxbuddify@gmail.com (cotización OR presupuesto OR proyecto)',
      'to:sercodamxbuddify@gmail.com (redes OR protección OR industrial)'
    ];

    const allEmails = [];

    for (const query of queries) {
      const emails = await this.searchEmails(query, 50);
      allEmails.push(...emails);
    }

    // Ordenar por fecha descendente y eliminar duplicados
    const uniqueEmails = allEmails.filter((email, index, self) => 
      index === self.findIndex(e => e.messageId === email.messageId)
    );

    return uniqueEmails.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Marcar email como leído
   */
  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      logger.error('❌ Error marking email as read:', error);
    }
  }

  /**
   * Agregar etiqueta al email
   */
  async addLabel(messageId, labelName) {
    try {
      // Primero obtener o crear la etiqueta
      const labels = await this.gmail.users.labels.list({ userId: 'me' });
      let labelId = labels.data.labels?.find(l => l.name === labelName)?.id;

      if (!labelId) {
        // Crear la etiqueta si no existe
        const newLabel = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: labelName,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        });
        labelId = newLabel.data.id;
      }

      if (labelId) {
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: [labelId]
          }
        });
      }
    } catch (error) {
      logger.error('❌ Error adding label:', error);
    }
  }

  /**
   * Parsear datos del cliente desde el email
   */
  parseClientData(email) {
    try {
      let source = 'LANDING';
      
      // Determinar fuente basada en el subject
      if (email.subject.includes('Cotización Nueva (Buddify)')) {
        source = 'COTIZATION';
      } else if (email.subject.includes('Contacto desde landing page')) {
        source = 'LANDING';
      } else if (email.subject.includes('Nuevo Contacto')) {
        source = 'FORM';
      } else if (email.subject.includes('Solicitud de Cotización')) {
        source = 'QUOTATION';
      }

      // Extraer datos según la fuente
      if (source === 'LANDING' || source === 'FORM') {
        return this.parseLandingPageEmail(email);
      } else if (source === 'COTIZATION' || source === 'QUOTATION') {
        return this.parseCotizationEmail(email);
      } else {
        return this.parseGenericEmail(email);
      }
    } catch (error) {
      logger.error('❌ Error parsing client data:', error);
      return null;
    }
  }

  /**
   * Parsear email de landing page
   */
  parseLandingPageEmail(email) {
    // Extraer email del remitente
    const emailMatch = email.from.match(/<([^>]+)>/);
    const clientEmail = emailMatch ? emailMatch[1] : email.from;

    // Extraer datos del cuerpo del email
    const body = email.body;
    let name = '';
    let phone = '';
    let company = '';

    // Buscar patrones comunes en emails de contacto
    const nameMatch = body.match(/(?:nombre|name)[:=]\s*([^\n\r]+)/i);
    if (nameMatch) name = nameMatch[1].trim();

    const phoneMatch = body.match(/(?:teléfono|telefono|phone)[:=]\s*([^\n\r]+)/i);
    if (phoneMatch) phone = phoneMatch[1].trim();

    const companyMatch = body.match(/(?:empresa|company)[:=]\s*([^\n\r]+)/i);
    if (companyMatch) company = companyMatch[1].trim();

    // Si no encontramos nombre, usar el nombre del email
    if (!name && email.from.includes('<')) {
      name = email.from.split('<')[0].trim().replace(/"/g, '');
    }

    return {
      name: name || 'Cliente desde Landing',
      email: clientEmail,
      phone: phone || undefined,
      company: company || undefined,
      message: body,
      source: 'LANDING',
      rawData: email
    };
  }

  /**
   * Parsear email de cotización
   */
  parseCotizationEmail(email) {
    // Extraer nombre del subject
    const subjectMatch = email.subject.match(/Cotización Nueva \(Buddify\) - (.+)/);
    const clientName = subjectMatch ? subjectMatch[1] : 'Cliente Cotización';

    // Extraer email del cuerpo o headers
    const emailMatch = email.body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const fromEmailMatch = email.from.match(/<([^>]+)>/);
    const clientEmail = emailMatch ? emailMatch[1] : (fromEmailMatch ? fromEmailMatch[1] : email.from);

    return {
      name: clientName,
      email: clientEmail,
      phone: undefined,
      company: undefined,
      message: email.body,
      source: 'COTIZATION',
      rawData: email
    };
  }

  /**
   * Parsear email genérico
   */
  parseGenericEmail(email) {
    // Extraer email del remitente
    const emailMatch = email.from.match(/<([^>]+)>/);
    const clientEmail = emailMatch ? emailMatch[1] : email.from;

    // Extraer nombre del remitente
    let name = '';
    if (email.from.includes('<')) {
      name = email.from.split('<')[0].trim().replace(/"/g, '');
    }

    return {
      name: name || 'Cliente Email',
      email: clientEmail,
      phone: undefined,
      company: undefined,
      message: email.body,
      source: 'EMAIL',
      rawData: email
    };
  }
}

module.exports = new GmailService();