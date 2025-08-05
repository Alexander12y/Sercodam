const OpenAI = require('openai');
const logger = require('../config/logger');

// Inicializar OpenAI solo si está configurado
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Procesar email con IA para extraer información del cliente
 */
async function processEmailWithAI(emailBody, subject, from) {
  try {
    logger.info('🤖 === INICIO PROCESAMIENTO IA ===');
    logger.info('📊 Datos de entrada:', { 
      emailBodyLength: emailBody.length, 
      subject, 
      from 
    });
    
    if (!openai) {
      logger.warn('⚠️ OpenAI no configurado, usando parsing manual');
      return null;
    }

    const prompt = `
Analiza el siguiente email de contacto y extrae la información del cliente en formato JSON.

EMAIL FROM: ${from}
SUBJECT: ${subject}
BODY: ${emailBody}

Este email proviene de:
- Landing page de Sercodam (si subject contiene "Contacto desde landing page")
- Buddify cotización (si subject contiene "Cotización Nueva (Buddify)")

Extrae la siguiente información y devuélvela en formato JSON válido:
{
  "name": "Nombre completo del cliente",
  "email": "Email del cliente (extráelo del FROM si no está en el body)",
  "phone": "Teléfono si está disponible (formato +52...)",
  "company": "Nombre de la empresa si se menciona",
  "location": "Ubicación/ciudad si se menciona",
  "projectDescription": "Descripción del proyecto o necesidad",
  "urgency": "LOW/MEDIUM/HIGH basado en el tono del mensaje",
  "estimatedBudget": "Número estimado si se menciona presupuesto",
  "preferredContactMethod": "EMAIL/PHONE/WHATSAPP basado en cómo contactó"
}

IMPORTANTE: 
- Si el email es de WordPress o automatizado, extrae la información del contenido real del cliente
- Si es de Buddify, el nombre del cliente puede estar en el subject después de "Cotización Nueva (Buddify) - "
- El phone debe estar en formato internacional (+52...)
- Solo devuelve el JSON, sin texto adicional
- Si no puedes extraer información válida, devuelve null

Ejemplos de información a extraer:
- Nombres como "Jesus Alfonso Felix Noriega", "Imelda Rodriguez", "Rufino Garcia Villanueva"
- Proyectos como "RED PARA PROTECCIÓN ANTI-CAÍDAS", "porteria profesional"
- Ubicaciones como "Pizza Rica Veracruz", "San Luis Potosí"
- Teléfonos como "8922255267", "4441653439"
`;

    logger.info('📤 Enviando request a OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en extraer información de contacto de emails. Devuelve siempre JSON válido o null."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    logger.info('📥 Respuesta recibida de OpenAI');

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content || content === 'null') {
      logger.warn('⚠️ OpenAI no pudo extraer información');
      return null;
    }

    logger.info('🔍 Parseando respuesta JSON:', content.substring(0, 100) + '...');

    // Intentar parsear el JSON
    let clientData;
    try {
      clientData = JSON.parse(content);
    } catch (parseError) {
      logger.error('❌ Error parsing AI response:', content);
      logger.error('Parse error:', parseError);
      return null;
    }

    // Validar que tenemos al menos nombre y email
    if (!clientData.name || !clientData.email) {
      logger.error('❌ Missing required fields:', clientData);
      return null;
    }

    // Limpiar y formatear el teléfono
    if (clientData.phone) {
      clientData.phone = formatPhoneNumber(clientData.phone);
    }

    // Si no hay email en el body, extraerlo del FROM
    if (!clientData.email.includes('@')) {
      const emailMatch = from.match(/<(.+@.+\..+)>/);
      if (emailMatch) {
        clientData.email = emailMatch[1];
      }
    }

    logger.info('✅ Procesamiento IA completado:', { name: clientData.name, email: clientData.email });
    return clientData;

  } catch (error) {
    logger.error('💥 Error processing email with AI:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
    }
    return null;
  }
}

/**
 * Formatear número de teléfono
 */
function formatPhoneNumber(phone) {
  // Limpiar el número de teléfono
  const cleaned = phone.replace(/\D/g, '');
  
  // Si ya tiene código de país, mantenerlo
  if (cleaned.startsWith('52') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // Si es número mexicano de 10 dígitos, agregar +52
  if (cleaned.length === 10) {
    return `+52${cleaned}`;
  }
  
  // Para otros casos, devolver tal como está
  return `+${cleaned}`;
}

/**
 * Generar mensaje de bienvenida personalizado
 */
async function generateWelcomeMessage(clientData) {
  try {
    if (!openai) {
      return 'Gracias por contactarnos. Nos pondremos en contacto pronto.';
    }

    const prompt = `
Genera un mensaje de bienvenida personalizado para este nuevo cliente:

Cliente: ${clientData.name}
Empresa: ${clientData.company || 'No especificada'}
Proyecto: ${clientData.projectDescription || 'No especificado'}
Ubicación: ${clientData.location || 'No especificada'}

El mensaje debe:
- Ser profesional pero cálido
- Mencionar que recibimos su solicitud
- Hacer referencia a su proyecto específico
- Indicar que alguien se pondrá en contacto pronto
- Incluir información de contacto: +52 55 1678 6301
- Ser conciso (máximo 150 palabras)

Empresa: Sercodam - Especialistas en redes de protección industrial
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Eres un asistente de Sercodam, empresa especializada en redes de protección industrial. Genera mensajes profesionales y personalizados."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content?.trim() || '';

  } catch (error) {
    logger.error('Error generating welcome message:', error);
    return '';
  }
}

/**
 * Procesar email con parsing manual (sin IA)
 */
function processEmailManual(emailBody, subject, from) {
  try {
    logger.info('🔍 Procesando email con parsing manual');
    
    // Extraer email del remitente
    const emailMatch = from.match(/<([^>]+)>/);
    const clientEmail = emailMatch ? emailMatch[1] : from;

    // Extraer nombre del remitente
    let name = '';
    if (from.includes('<')) {
      name = from.split('<')[0].trim().replace(/"/g, '');
    }

    // Extraer datos del cuerpo del email
    const body = emailBody;
    let phone = '';
    let company = '';
    let location = '';
    let projectDescription = '';
    let urgency = 'MEDIUM';
    let estimatedBudget = null;

    // Buscar patrones comunes
    const phoneMatch = body.match(/(?:teléfono|telefono|phone|celular|móvil)[:=]\s*([^\n\r]+)/i);
    if (phoneMatch) phone = formatPhoneNumber(phoneMatch[1].trim());

    const companyMatch = body.match(/(?:empresa|company|compañía)[:=]\s*([^\n\r]+)/i);
    if (companyMatch) company = companyMatch[1].trim();

    const locationMatch = body.match(/(?:ubicación|ubicacion|location|ciudad|estado)[:=]\s*([^\n\r]+)/i);
    if (locationMatch) location = locationMatch[1].trim();

    const budgetMatch = body.match(/(?:presupuesto|budget|precio)[:=]\s*\$?([0-9,]+)/i);
    if (budgetMatch) estimatedBudget = parseFloat(budgetMatch[1].replace(/,/g, ''));

    // Detectar urgencia
    if (body.match(/(?:urgente|urgent|inmediato|asap)/i)) {
      urgency = 'HIGH';
    } else if (body.match(/(?:pronto|soon|rápido)/i)) {
      urgency = 'MEDIUM';
    } else {
      urgency = 'LOW';
    }

    // Extraer descripción del proyecto (primeras líneas del email)
    const lines = body.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      projectDescription = lines[0].substring(0, 200);
    }

    return {
      name: name || 'Cliente Email',
      email: clientEmail,
      phone: phone || undefined,
      company: company || undefined,
      location: location || undefined,
      projectDescription: projectDescription || undefined,
      urgency: urgency,
      estimatedBudget: estimatedBudget || undefined,
      preferredContactMethod: 'EMAIL'
    };

  } catch (error) {
    logger.error('❌ Error en parsing manual:', error);
    return null;
  }
}

module.exports = {
  processEmailWithAI,
  processEmailManual,
  generateWelcomeMessage,
  formatPhoneNumber
};