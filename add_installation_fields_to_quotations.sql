-- Script SQL para agregar campos de instalación a la tabla cotizacion
-- Ejecutar solo si se desea persistir los datos de instalación en la base de datos

-- Agregar campos para información detallada de instalación
ALTER TABLE cotizacion 
ADD COLUMN instalacion_incluye TEXT,
ADD COLUMN instalacion_no_incluye TEXT;

-- Comentarios explicativos
COMMENT ON COLUMN cotizacion.instalacion_incluye IS 'Texto detallado de lo que incluye el servicio de instalación';
COMMENT ON COLUMN cotizacion.instalacion_no_incluye IS 'Texto detallado de lo que NO incluye el servicio de instalación';

-- Ejemplo de actualización para cotizaciones existentes que incluyen instalación
-- UPDATE cotizacion 
-- SET instalacion_incluye = 'MANO DE OBRA CERTIFICADA PARA TRABAJOS A GRAN ALTURA (DC-3)
-- HERRAMIENTA Y EQUIPOS COMPLETO PARA LA CORRECTA INSTALACIÓN
-- MATERIALES DE FIJACIÓN Y SUJECIÓN NECESARIOS
-- TRASLADO HASTA LA UBICACIÓN DEL PROYECTO'
-- WHERE incluye_instalacion = true AND instalacion_incluye IS NULL;