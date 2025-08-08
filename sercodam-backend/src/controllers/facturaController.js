const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sercodam_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    schema: process.env.DB_SCHEMA || 'catalogo_1'
});

// Get all invoices with pagination and filters
const getFacturas = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            estado, 
            cliente, 
            fecha_desde, 
            fecha_hasta,
            numero_factura 
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];

        // Build WHERE conditions
        if (estado) {
            whereConditions.push(`f.estado = $${queryParams.length + 1}`);
            queryParams.push(estado);
        }

        if (cliente) {
            whereConditions.push(`(f.nombre_cliente ILIKE $${queryParams.length + 1} OR f.empresa_cliente ILIKE $${queryParams.length + 1})`);
            queryParams.push(`%${cliente}%`);
        }

        if (fecha_desde) {
            whereConditions.push(`f.fecha_emision >= $${queryParams.length + 1}`);
            queryParams.push(fecha_desde);
        }

        if (fecha_hasta) {
            whereConditions.push(`f.fecha_emision <= $${queryParams.length + 1}`);
            queryParams.push(fecha_hasta);
        }

        if (numero_factura) {
            whereConditions.push(`f.numero_factura ILIKE $${queryParams.length + 1}`);
            queryParams.push(`%${numero_factura}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count total records
        const countQuery = `
            SELECT COUNT(*) as total
            FROM factura f
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const totalRecords = parseInt(countResult.rows[0].total);

        // Get paginated results
        const dataQuery = `
            SELECT 
                f.id_factura,
                f.numero_factura,
                f.id_cliente,
                f.id_cotizacion,
                f.fecha_emision,
                f.fecha_vencimiento,
                f.subtotal,
                f.iva,
                f.total,
                f.estado,
                f.metodo_pago,
                f.condiciones_pago,
                f.notas,
                f.fecha_creacion,
                f.fecha_actualizacion,
                f.nombre_cliente,
                f.empresa_cliente,
                f.email_cliente,
                f.telefono_cliente,
                f.rfc_cliente,
                f.direccion_fiscal,
                c.nombre_cliente as cliente_nombre,
                c.empresa_cliente as cliente_empresa,
                COALESCE(SUM(p.monto), 0) as total_pagado,
                (f.total - COALESCE(SUM(p.monto), 0)) as saldo_pendiente
            FROM factura f
            LEFT JOIN cliente c ON f.id_cliente = c.id_cliente
            LEFT JOIN pago p ON f.id_factura = p.id_factura
            ${whereClause}
            GROUP BY f.id_factura, c.nombre_cliente, c.empresa_cliente
            ORDER BY f.fecha_emision DESC
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `;

        const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);

        const totalPages = Math.ceil(totalRecords / limit);

        res.json({
            success: true,
            data: {
                facturas: dataResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalRecords,
                    totalPages
                }
            }
        });

    } catch (error) {
        console.error('Error getting facturas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las facturas',
            error: error.message
        });
    }
};

// Get single invoice by ID
const getFacturaById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get invoice details
        const facturaQuery = `
            SELECT 
                f.*,
                c.nombre_cliente as cliente_nombre,
                c.empresa_cliente as cliente_empresa,
                c.email_cliente as cliente_email,
                c.telefono_cliente as cliente_telefono,
                COALESCE(SUM(p.monto), 0) as total_pagado,
                (f.total - COALESCE(SUM(p.monto), 0)) as saldo_pendiente
            FROM factura f
            LEFT JOIN cliente c ON f.id_cliente = c.id_cliente
            LEFT JOIN pago p ON f.id_factura = p.id_factura
            WHERE f.id_factura = $1
            GROUP BY f.id_factura, c.nombre_cliente, c.empresa_cliente, c.email_cliente, c.telefono_cliente
        `;

        const facturaResult = await pool.query(facturaQuery, [id]);

        if (facturaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        // Get invoice details
        const detalleQuery = `
            SELECT *
            FROM factura_detalle
            WHERE id_factura = $1
            ORDER BY orden_index, id_detalle
        `;

        const detalleResult = await pool.query(detalleQuery, [id]);

        // Get payments
        const pagosQuery = `
            SELECT *
            FROM pago
            WHERE id_factura = $1
            ORDER BY fecha_pago DESC
        `;

        const pagosResult = await pool.query(pagosQuery, [id]);

        // Get related quotation if exists
        let cotizacion = null;
        if (facturaResult.rows[0].id_cotizacion) {
            const cotizacionQuery = `
                SELECT id_cotizacion, numero_cotizacion, titulo_proyecto, total
                FROM cotizacion
                WHERE id_cotizacion = $1
            `;
            const cotizacionResult = await pool.query(cotizacionQuery, [facturaResult.rows[0].id_cotizacion]);
            if (cotizacionResult.rows.length > 0) {
                cotizacion = cotizacionResult.rows[0];
            }
        }

        res.json({
            success: true,
            data: {
                factura: facturaResult.rows[0],
                detalle: detalleResult.rows,
                pagos: pagosResult.rows,
                cotizacion
            }
        });

    } catch (error) {
        console.error('Error getting factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la factura',
            error: error.message
        });
    }
};

// Create new invoice
const createFactura = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const {
            id_cliente,
            id_cotizacion,
            fecha_vencimiento,
            metodo_pago,
            condiciones_pago,
            notas,
            detalle,
            nombre_cliente,
            empresa_cliente,
            email_cliente,
            telefono_cliente,
            rfc_cliente,
            direccion_fiscal
        } = req.body;

        // Validate required fields
        if (!id_cliente || !fecha_vencimiento || !detalle || detalle.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: id_cliente, fecha_vencimiento, detalle'
            });
        }

        // Get client information if not provided
        let clienteInfo = {};
        if (!nombre_cliente) {
            const clienteQuery = `
                SELECT nombre_cliente, empresa_cliente, email_cliente, telefono_cliente
                FROM cliente
                WHERE id_cliente = $1
            `;
            const clienteResult = await client.query(clienteQuery, [id_cliente]);
            if (clienteResult.rows.length > 0) {
                clienteInfo = clienteResult.rows[0];
            }
        }

        // Create invoice
        const facturaQuery = `
            INSERT INTO factura (
                id_cliente, id_cotizacion, fecha_vencimiento, metodo_pago, 
                condiciones_pago, notas, nombre_cliente, empresa_cliente, 
                email_cliente, telefono_cliente, rfc_cliente, direccion_fiscal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const facturaResult = await client.query(facturaQuery, [
            id_cliente,
            id_cotizacion || null,
            fecha_vencimiento,
            metodo_pago || null,
            condiciones_pago || null,
            notas || null,
            nombre_cliente || clienteInfo.nombre_cliente,
            empresa_cliente || clienteInfo.empresa_cliente,
            email_cliente || clienteInfo.email_cliente,
            telefono_cliente || clienteInfo.telefono_cliente,
            rfc_cliente || null,
            direccion_fiscal || null
        ]);

        const factura = facturaResult.rows[0];

        // Create invoice details
        for (let i = 0; i < detalle.length; i++) {
            const item = detalle[i];
            const subtotal = item.cantidad * item.precio_unitario;
            const iva_monto = subtotal * (item.iva_porcentaje / 100);
            const total_linea = subtotal + iva_monto;

            const detalleQuery = `
                INSERT INTO factura_detalle (
                    id_factura, descripcion, cantidad, precio_unitario,
                    subtotal, iva_porcentaje, iva_monto, total_linea,
                    orden_index, notas, catalogo, tipo_item
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;

            await client.query(detalleQuery, [
                factura.id_factura,
                item.descripcion,
                item.cantidad,
                item.precio_unitario,
                subtotal,
                item.iva_porcentaje || 16.00,
                iva_monto,
                total_linea,
                item.orden_index || i,
                item.notas || null,
                item.catalogo || null,
                item.tipo_item || null
            ]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Factura creada exitosamente',
            data: {
                id_factura: factura.id_factura,
                numero_factura: factura.numero_factura
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la factura',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Update invoice
const updateFactura = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const {
            fecha_vencimiento,
            metodo_pago,
            condiciones_pago,
            notas,
            detalle,
            rfc_cliente,
            direccion_fiscal
        } = req.body;

        // Check if invoice exists and is not paid
        const checkQuery = `
            SELECT estado FROM factura WHERE id_factura = $1
        `;
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        if (checkResult.rows[0].estado === 'pagada') {
            return res.status(400).json({
                success: false,
                message: 'No se puede modificar una factura pagada'
            });
        }

        // Update invoice
        const updateQuery = `
            UPDATE factura SET
                fecha_vencimiento = COALESCE($1, fecha_vencimiento),
                metodo_pago = COALESCE($2, metodo_pago),
                condiciones_pago = COALESCE($3, condiciones_pago),
                notas = COALESCE($4, notas),
                rfc_cliente = COALESCE($5, rfc_cliente),
                direccion_fiscal = COALESCE($6, direccion_fiscal),
                fecha_actualizacion = NOW()
            WHERE id_factura = $7
            RETURNING *
        `;

        await client.query(updateQuery, [
            fecha_vencimiento,
            metodo_pago,
            condiciones_pago,
            notas,
            rfc_cliente,
            direccion_fiscal,
            id
        ]);

        // Update details if provided
        if (detalle && detalle.length > 0) {
            // Delete existing details
            await client.query('DELETE FROM factura_detalle WHERE id_factura = $1', [id]);

            // Insert new details
            for (let i = 0; i < detalle.length; i++) {
                const item = detalle[i];
                const subtotal = item.cantidad * item.precio_unitario;
                const iva_monto = subtotal * (item.iva_porcentaje / 100);
                const total_linea = subtotal + iva_monto;

                const detalleQuery = `
                    INSERT INTO factura_detalle (
                        id_factura, descripcion, cantidad, precio_unitario,
                        subtotal, iva_porcentaje, iva_monto, total_linea,
                        orden_index, notas, catalogo, tipo_item
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `;

                await client.query(detalleQuery, [
                    id,
                    item.descripcion,
                    item.cantidad,
                    item.precio_unitario,
                    subtotal,
                    item.iva_porcentaje || 16.00,
                    iva_monto,
                    total_linea,
                    item.orden_index || i,
                    item.notas || null,
                    item.catalogo || null,
                    item.tipo_item || null
                ]);
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Factura actualizada exitosamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la factura',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Change invoice status
const changeFacturaStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: 'El estado es requerido'
            });
        }

        const validStates = ['borrador', 'emitida', 'pagada', 'cancelada', 'vencida', 'parcialmente_pagada'];
        if (!validStates.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        const updateQuery = `
            UPDATE factura 
            SET estado = $1, fecha_actualizacion = NOW()
            WHERE id_factura = $2
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [estado, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Estado de factura actualizado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error changing factura status:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado de la factura',
            error: error.message
        });
    }
};

// Register payment
const registerPago = async (req, res) => {
    try {
        const { id_factura } = req.params;
        const {
            monto,
            metodo_pago,
            referencia_pago,
            notas,
            fecha_pago
        } = req.body;

        if (!monto || !metodo_pago) {
            return res.status(400).json({
                success: false,
                message: 'Monto y método de pago son requeridos'
            });
        }

        // Check if invoice exists
        const facturaQuery = `
            SELECT total, estado FROM factura WHERE id_factura = $1
        `;
        const facturaResult = await pool.query(facturaQuery, [id_factura]);

        if (facturaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        const factura = facturaResult.rows[0];

        // Check if invoice is already paid
        if (factura.estado === 'pagada') {
            return res.status(400).json({
                success: false,
                message: 'La factura ya está pagada'
            });
        }

        // Get total paid
        const pagosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_pagado
            FROM pago
            WHERE id_factura = $1
        `;
        const pagosResult = await pool.query(pagosQuery, [id_factura]);
        const totalPagado = parseFloat(pagosResult.rows[0].total_pagado);

        // Check if payment exceeds remaining amount
        const saldoPendiente = factura.total - totalPagado;
        if (monto > saldoPendiente) {
            return res.status(400).json({
                success: false,
                message: `El monto excede el saldo pendiente ($${saldoPendiente.toFixed(2)})`
            });
        }

        // Register payment
        const pagoQuery = `
            INSERT INTO pago (
                id_factura, monto, metodo_pago, referencia_pago, 
                notas, fecha_pago
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const pagoResult = await pool.query(pagoQuery, [
            id_factura,
            monto,
            metodo_pago,
            referencia_pago || null,
            notas || null,
            fecha_pago || new Date()
        ]);

        res.status(201).json({
            success: true,
            message: 'Pago registrado exitosamente',
            data: pagoResult.rows[0]
        });

    } catch (error) {
        console.error('Error registering payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar el pago',
            error: error.message
        });
    }
};

// Delete invoice (only if it's a draft)
const deleteFactura = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if invoice exists and is a draft
        const checkQuery = `
            SELECT estado FROM factura WHERE id_factura = $1
        `;
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        if (checkResult.rows[0].estado !== 'borrador') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden eliminar facturas en estado borrador'
            });
        }

        // Delete invoice (details and payments will be deleted by CASCADE)
        const deleteQuery = `
            DELETE FROM factura WHERE id_factura = $1
        `;
        await pool.query(deleteQuery, [id]);

        res.json({
            success: true,
            message: 'Factura eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error deleting factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la factura',
            error: error.message
        });
    }
};

// Get invoice statistics
const getFacturaStats = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        let whereConditions = [];
        let queryParams = [];

        if (fecha_desde) {
            whereConditions.push(`fecha_emision >= $${queryParams.length + 1}`);
            queryParams.push(fecha_desde);
        }

        if (fecha_hasta) {
            whereConditions.push(`fecha_emision <= $${queryParams.length + 1}`);
            queryParams.push(fecha_hasta);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_facturas,
                COUNT(CASE WHEN estado = 'emitida' THEN 1 END) as facturas_emitidas,
                COUNT(CASE WHEN estado = 'pagada' THEN 1 END) as facturas_pagadas,
                COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as facturas_canceladas,
                COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as facturas_vencidas,
                SUM(total) as total_facturado,
                SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as total_pagado,
                SUM(CASE WHEN estado IN ('emitida', 'parcialmente_pagada') THEN total ELSE 0 END) as total_pendiente
            FROM factura
            ${whereClause}
        `;

        const statsResult = await pool.query(statsQuery, queryParams);
        const stats = statsResult.rows[0];

        // Get monthly totals for current year
        const monthlyQuery = `
            SELECT 
                EXTRACT(MONTH FROM fecha_emision) as mes,
                COUNT(*) as cantidad,
                SUM(total) as total_mes
            FROM factura
            WHERE EXTRACT(YEAR FROM fecha_emision) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY EXTRACT(MONTH FROM fecha_emision)
            ORDER BY mes
        `;

        const monthlyResult = await pool.query(monthlyQuery);

        res.json({
            success: true,
            data: {
                estadisticas: stats,
                mensual: monthlyResult.rows
            }
        });

    } catch (error) {
        console.error('Error getting factura stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

module.exports = {
    getFacturas,
    getFacturaById,
    createFactura,
    updateFactura,
    changeFacturaStatus,
    registerPago,
    deleteFactura,
    getFacturaStats
};
