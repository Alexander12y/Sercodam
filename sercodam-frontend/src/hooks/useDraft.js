import { useState, useEffect, useCallback, useRef } from 'react';
import { draftsApi } from '../services/api';

export const useDraft = (userId, pasoActual = 1) => {
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
      const response = await draftsApi.getDraftByUser(userId);
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

  const saveDraft = useCallback(async (formData, panosSeleccionados = [], materialesSeleccionados = [], herramientasSeleccionadas = []) => {
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
        const panosArray = Array.isArray(panosSeleccionados) ? panosSeleccionados : [];
        const materialesArray = Array.isArray(materialesSeleccionados) ? materialesSeleccionados : [];
        const herramientasArray = Array.isArray(herramientasSeleccionadas) ? herramientasSeleccionadas : [];

        const draftData = {
          id_usuario: userId,
          datos_formulario: formData,
          panos_seleccionados: panosArray,
          materiales_seleccionados: materialesArray,
          herramientas_seleccionadas: herramientasArray,
          paso_actual: pasoActual
        };

        const response = await draftsApi.saveDraft(draftData);
        if (response.data?.data) {
          setDraft(response.data.data);
          setLastSaved(new Date());
        }
      } catch (error) {
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [userId, pasoActual]);

  const saveDraftImmediately = useCallback(async (formData, panosSeleccionados = [], materialesSeleccionados = [], herramientasSeleccionadas = []) => {
    if (!userId || !formData || !isInitializedRef.current) {
      console.log('❌ No se puede guardar draft inmediatamente:', { userId: !!userId, formData: !!formData, isInitialized: isInitializedRef.current });
      return;
    }

    // Asegurar que los arrays sean realmente arrays y no objetos
    const panosArray = Array.isArray(panosSeleccionados) ? panosSeleccionados : [];
    const materialesArray = Array.isArray(materialesSeleccionados) ? materialesSeleccionados : [];
    const herramientasArray = Array.isArray(herramientasSeleccionadas) ? herramientasSeleccionadas : [];

    console.log('💾 Guardando draft inmediatamente...', { 
      userId, 
      pasoActual, 
      panosCount: panosArray.length,
      materialesCount: materialesArray.length,
      herramientasCount: herramientasArray.length
    });
    setSaving(true);
    try {
      const draftData = {
        id_usuario: userId,
        datos_formulario: formData,
        panos_seleccionados: panosArray,
        materiales_seleccionados: materialesArray,
        herramientas_seleccionadas: herramientasArray,
        paso_actual: pasoActual
      };

      console.log('📤 Enviando datos de draft inmediatamente:', draftData);
      
      // Log detallado de los arrays para debugging
      console.log('📋 Panos array a enviar:', JSON.stringify(panosArray, null, 2));
      console.log('📋 Materiales array a enviar:', JSON.stringify(materialesArray, null, 2));
      console.log('📋 Herramientas array a enviar:', JSON.stringify(herramientasArray, null, 2));
      
      const response = await draftsApi.saveDraft(draftData);
      console.log('📥 Respuesta de guardado inmediato:', response.data);
      if (response.data?.data) {
        setDraft(response.data.data);
        setLastSaved(new Date());
        console.log('✅ Draft guardado inmediatamente exitosamente');
      }
    } catch (error) {
      console.error('❌ Error guardando draft inmediatamente:', error);
    } finally {
      setSaving(false);
    }
  }, [userId, pasoActual]);

  const deleteDraft = useCallback(async () => {
    if (!userId) return;

    try {
      await draftsApi.deleteUserDraft(userId);
      setDraft(null);
      setLastSaved(null);
    } catch (error) {
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
          draft.panos_seleccionados,
          draft.materiales_seleccionados,
          draft.herramientas_seleccionadas
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