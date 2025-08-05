const OpenAI = require('openai');
const logger = require('../config/logger');

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Genera una descripción técnica para una cotización usando IA
 */
const generateDescriptionWithAI = async (context) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key no configurada, usando descripción por defecto');
      return generateDefaultDescription(context);
    }

    const { tipo_proyecto, items, ficha_tecnica } = context;

    // Construir el prompt
    const prompt = buildDescriptionPrompt(tipo_proyecto, items, ficha_tecnica);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Eres un experto técnico en redes de protección y sistemas industriales de Sercodam. 
          Tu tarea es generar descripciones técnicas profesionales para cotizaciones.
          
          Instrucciones:
          - Usa un lenguaje técnico pero comprensible
          - Incluye especificaciones técnicas relevantes
          - Menciona las normas y certificaciones aplicables
          - Explica qué incluye la cotización
          - Mantén un tono profesional y confiable
          - No excedas 3-4 párrafos
          - Usa terminología específica del sector`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const description = completion.choices[0].message.content.trim();
    
    logger.info('Descripción generada con IA exitosamente');
    
    return description;

  } catch (error) {
    logger.error('Error generando descripción con IA:', error);
    
    // Fallback a descripción por defecto
    return generateDefaultDescription(context);
  }
};

/**
 * Construye el prompt para la generación de descripción
 */
const buildDescriptionPrompt = (tipo_proyecto, items, ficha_tecnica) => {
  const itemsText = items.map(item => 
    `- ${item.nombre}: ${item.cantidad} ${item.unidad}`
  ).join('\n');

  const fichaTecnicaText = ficha_tecnica ? 
    `\n\nFicha técnica del material principal:\n${ficha_tecnica}` : '';

  return `Genera una descripción técnica para una cotización de ${tipo_proyecto} que incluya:

Tipo de proyecto: ${tipo_proyecto}

Productos y cantidades:
${itemsText}${fichaTecnicaText}

La descripción debe explicar:
1. Qué incluye la cotización
2. El tipo de material utilizado y sus características
3. Las especificaciones técnicas relevantes
4. Las normas y certificaciones que cumple
5. Los beneficios y aplicaciones del sistema

Formato la respuesta como un párrafo técnico profesional, sin usar viñetas ni listas.`;
};

/**
 * Genera una descripción por defecto cuando no hay IA disponible
 */
const generateDefaultDescription = (context) => {
  const { tipo_proyecto, items } = context;
  
  const itemsText = items.map(item => 
    `${item.cantidad} ${item.unidad} de ${item.nombre}`
  ).join(', ');

  const descripcionesPorTipo = {
    'red_deportiva': `Suministro e instalación de sistema de red deportiva profesional, incluyendo ${itemsText}. El sistema está diseñado para cumplir con los estándares internacionales de seguridad y durabilidad, garantizando un rendimiento óptimo en condiciones de uso intensivo.`,
    
    'sistema_proteccion': `Suministro e instalación de sistema de protección perimetral contra caídas en alturas, incluyendo ${itemsText}. El sistema cumple con la Norma Oficial Mexicana NOM-009-STPS-2011 y está certificado para uso industrial.`,
    
    'red_industrial': `Suministro e instalación de red de protección industrial, incluyendo ${itemsText}. El sistema está diseñado para aplicaciones industriales exigentes, con materiales de alta resistencia y durabilidad.`,
    
    'malla_sombra': `Suministro e instalación de sistema de malla sombra, incluyendo ${itemsText}. El sistema proporciona protección solar efectiva y está diseñado para resistir condiciones climáticas adversas.`,
    
    'lona_industrial': `Suministro e instalación de lona industrial de protección, incluyendo ${itemsText}. El sistema está diseñado para aplicaciones industriales con materiales resistentes a químicos y condiciones extremas.`,
    
    'red_golf': `Suministro e instalación de red de protección para campo de golf, incluyendo ${itemsText}. El sistema está diseñado específicamente para capturar pelotas de golf y proteger áreas sensibles.`,
    
    'sistema_anti_caida': `Suministro e instalación de sistema anti-caída tipo horca, incluyendo ${itemsText}. El sistema cumple con las especificaciones de seguridad industrial y está certificado para protección de trabajadores en alturas.`
  };

  return descripcionesPorTipo[tipo_proyecto] || 
    `Suministro e instalación de sistema de ${tipo_proyecto}, incluyendo ${itemsText}. El sistema está diseñado para cumplir con los estándares de calidad y seguridad aplicables.`;
};

/**
 * Analiza el contenido de un documento con IA
 */
const analyzeDocumentWithAI = async (content, documentType) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key no configurada, análisis de documento no disponible');
      return null;
    }

    const prompt = buildDocumentAnalysisPrompt(content, documentType);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Eres un experto en análisis de documentos comerciales y fiscales. 
          Tu tarea es extraer información estructurada de documentos.
          
          Responde en formato JSON con los campos relevantes según el tipo de documento.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const response = completion.choices[0].message.content.trim();
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      logger.error('Error parseando respuesta de IA:', parseError);
      return null;
    }

  } catch (error) {
    logger.error('Error analizando documento con IA:', error);
    return null;
  }
};

/**
 * Construye el prompt para análisis de documentos
 */
const buildDocumentAnalysisPrompt = (content, documentType) => {
  const prompts = {
    'FISCAL_DOCUMENT': `Analiza el siguiente documento fiscal y extrae la información en formato JSON:
    
    Contenido: ${content}
    
    Extrae estos campos:
    {
      "rfc": "RFC del contribuyente",
      "razon_social": "Razón social o nombre",
      "direccion": "Dirección fiscal",
      "regimen_fiscal": "Régimen fiscal",
      "confianza": 0.95
    }`,
    
    'PAYMENT_RECEIPT': `Analiza el siguiente comprobante de pago y extrae la información en formato JSON:
    
    Contenido: ${content}
    
    Extrae estos campos:
    {
      "monto": "Monto del pago",
      "fecha": "Fecha del pago",
      "metodo_pago": "Método de pago",
      "referencia": "Número de referencia",
      "confianza": 0.95
    }`
  };

  return prompts[documentType] || `Analiza el siguiente documento y extrae información relevante en formato JSON:
  
  Contenido: ${content}
  
  Responde con los campos que puedas identificar.`;
};

/**
 * Valida si la configuración de IA está disponible
 */
const isAIAvailable = () => {
  return !!process.env.OPENAI_API_KEY;
};

/**
 * Obtiene información de configuración de IA
 */
const getAIConfig = () => {
  return {
    available: isAIAvailable(),
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7
  };
};

module.exports = {
  generateDescriptionWithAI,
  analyzeDocumentWithAI,
  isAIAvailable,
  getAIConfig
}; 