import { useState, useEffect, useCallback, useRef } from 'react';
import { cotizacionesDraftsApi } from '../services/api';

export const useCotizacionDraft = (userId, seccionActual = 1) => {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Inicializar el hook cuando se monta
  useEffect(() => {
    if (userId && !isInitializedRef.current) {
      isInitializedRef.current = true;
    }
  }, [userId]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  const loadDraft = async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const response = await cotizacionesDraftsApi.getDraftByUser(userId);
      if (response.data?.data && response.data.data !== null) {
        setDraft(response.data.data);
        setLastSaved(new Date(response.data.data.fecha_actualizacion));
      } else {
        setDraft(null);
        setLastSaved(null);
      }
    } catch (error) {
      setDraft(null);
      setLastSaved(null);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = useCallback(async (formData, detalleProductos = [], conceptosExtraList = []) => {
    if (!userId || !formData || !isInitializedRef.current) {
      return;
    }

    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Programar guardado automático después de 2 segundos
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        // Asegurar que los arrays sean realmente arrays y no objetos
        const detalleArray = Array.isArray(detalleProductos) ? detalleProductos : [];
        const conceptosArray = Array.isArray(conceptosExtraList) ? conceptosExtraList : [];

        const draftData = {
          id_usuario: userId,
          datos_formulario: formData,
          detalle_productos: detalleArray,
          conceptos_extra_list: conceptosArray,
          seccion_actual: seccionActual
        };

        const response = await cotizacionesDraftsApi.saveDraft(draftData);
        if (response.data?.data) {
          setDraft(response.data.data);
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Error guardando draft de cotización:', error);
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [userId, seccionActual]);

  const saveDraftImmediately = useCallback(async (formData, detalleProductos = [], conceptosExtraList = []) => {
    if (!userId || !formData || !isInitializedRef.current) {
      console.log('❌ No se puede guardar draft de cotización inmediatamente:', { 
        userId: !!userId, 
        formData: !!formData, 
        isInitialized: isInitializedRef.current 
      });
      return;
    }

    // Asegurar que los arrays sean realmente arrays y no objetos
    const detalleArray = Array.isArray(detalleProductos) ? detalleProductos : [];
    const conceptosArray = Array.isArray(conceptosExtraList) ? conceptosExtraList : [];

    console.log('💾 Guardando draft de cotización inmediatamente...', { 
      userId, 
      seccionActual, 
      detalleCount: detalleArray.length,
      conceptosCount: conceptosArray.length
    });

    setSaving(true);
    try {
      const draftData = {
        id_usuario: userId,
        datos_formulario: formData,
        detalle_productos: detalleArray,
        conceptos_extra_list: conceptosArray,
        seccion_actual: seccionActual
      };

      console.log('📤 Enviando datos de draft de cotización inmediatamente:', draftData);
      
      // Log detallado de los arrays para debugging
      console.log('📋 Detalle productos array a enviar:', JSON.stringify(detalleArray, null, 2));
      console.log('📋 Conceptos extra array a enviar:', JSON.stringify(conceptosArray, null, 2));
      
      const response = await cotizacionesDraftsApi.saveDraft(draftData);
      console.log('📥 Respuesta de guardado inmediato de cotización:', response.data);
      if (response.data?.data) {
        setDraft(response.data.data);
        setLastSaved(new Date());
        console.log('✅ Draft de cotización guardado inmediatamente exitosamente');
      }
    } catch (error) {
      console.error('❌ Error guardando draft de cotización inmediatamente:', error);
    } finally {
      setSaving(false);
    }
  }, [userId, seccionActual]);

  const deleteDraft = useCallback(async () => {
    if (!userId) return;

    try {
      await cotizacionesDraftsApi.deleteUserDraft(userId);
      setDraft(null);
      setLastSaved(null);
    } catch (error) {
      console.error('Error eliminando draft de cotización:', error);
    }
  }, [userId]);

  const resetInactivityTimer = useCallback(() => {
    // Limpiar timeout anterior
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Programar guardado por inactividad después de 30 segundos
    inactivityTimeoutRef.current = setTimeout(() => {
      if (draft) {
        saveDraftImmediately(
          draft.datos_formulario,
          draft.detalle_productos,
          draft.conceptos_extra_list
        );
      }
    }, 30000);
  }, [draft, saveDraftImmediately]);

  // Resetear timer de inactividad cuando hay actividad del usuario
  useEffect(() => {
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Eventos para detectar actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Iniciar timer de inactividad
    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [resetInactivityTimer]);

  return {
    draft,
    loading,
    saving,
    lastSaved,
    saveDraft,
    saveDraftImmediately,
    deleteDraft,
    loadDraft,
    resetInactivityTimer
  };
};