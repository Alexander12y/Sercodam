const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';
const LOGIN_CREDENTIALS = {
    username: 'admin',
    password: 'Admin123!'
};

// Función para hacer login y obtener token
async function loginAndGetToken() {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, LOGIN_CREDENTIALS);
        return res.data.token || res.data.accessToken || res.data.data?.tokens?.accessToken;
    } catch (error) {
        console.error('❌ Error al hacer login:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function testCrearOrden(token) {
    try {
        const response = await axios.post(
            `${API_URL}/ordenes`,
            {
                cliente: 'Cliente de Prueba',
                observaciones: 'Orden de prueba automatizada',
                prioridad: 'alta',
                fecha_inicio: '2024-06-01',
                fecha_fin: '2024-06-10',
                materiales: [
                    { id_item: 560, cantidad: 1, tipo_item: 'PANO', notas: 'Paño de prueba' },
                    { id_item: 1, cantidad: 1, tipo_item: 'EXTRA', notas: 'Material extra de prueba' }
                ],
                herramientas: [
                    { id_item: 274, cantidad: 1, notas: 'Herramienta de prueba' }
                ]
            },
            {
            headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('✅ Orden creada:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Error en la respuesta:', error.response.data);
        } else {
            console.error('❌ Error en la petición:', error.message);
        }
    }
}

(async () => {
    const token = await loginAndGetToken();
    await testCrearOrden(token);
})(); 