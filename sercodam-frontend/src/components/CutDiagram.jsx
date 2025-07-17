import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';

const CutDiagram = ({ cut, width = 500, height = 400 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !cut) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Set actual size in memory (scaled up for retina displays)
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale the drawing context so everything draws at the correct size
        ctx.scale(dpr, dpr);

        // Set the display size (css pixels)
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Drawing constants
        const margin = 25;
        const diagramWidth = width - 2 * margin;
        const diagramHeight = height - 2 * margin;
        const titleHeight = 35;
        const legendHeight = 90;

        // Available space for the actual diagram
        const availableWidth = diagramWidth;
        const availableHeight = diagramHeight - titleHeight - legendHeight;

        // Draw title
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Diagrama de Corte Guillotina', width / 2, margin + 20);

        // Get original pano dimensions
        const H = parseFloat(cut.pano_original?.largo || 0);
        const W = parseFloat(cut.pano_original?.ancho || 0);
        const Hreq = parseFloat(cut.altura_req || 0);
        const Wreq = parseFloat(cut.ancho_req || 0);

        if (H === 0 || W === 0) {
            ctx.fillStyle = '#666666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Dimensiones no disponibles', width / 2, height / 2);
            return;
        }

        // Determine which dimension is larger
        const dimensionMayor = Math.max(H, W);
        const dimensionMenor = Math.min(H, W);

        // Calculate scale to fit the diagram with some padding
        const scaleX = (availableWidth - 40) / dimensionMayor;
        const scaleY = (availableHeight - 40) / dimensionMenor;
        const scale = Math.min(scaleX, scaleY);

        // Calculate diagram position (centered)
        const diagramX = margin + (availableWidth - dimensionMayor * scale) / 2;
        const diagramY = margin + titleHeight + (availableHeight - dimensionMenor * scale) / 2;

        // Draw original pano (gray background)
        ctx.fillStyle = '#f0f0f0';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillRect(diagramX, diagramY, dimensionMayor * scale, dimensionMenor * scale);
        ctx.strokeRect(diagramX, diagramY, dimensionMayor * scale, dimensionMenor * scale);

        // Add original pano text (positioned to avoid overlap)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Original: ${H.toFixed(2)}m x ${W.toFixed(2)}m`, diagramX + 8, diagramY + 18);

        // Draw cuts and pieces if plans exist
        if (cut.plans && cut.plans.length > 0) {
            const objetivo = cut.plans.find(p => p.rol_pieza === 'Objetivo');
            const remanentes = cut.plans.filter(p => p.rol_pieza !== 'Objetivo');

            if (objetivo) {
                // Calculate objective piece position (from bottom-left corner)
                const objetivoX = diagramX;
                const objetivoY = diagramY + dimensionMenor * scale - (Hreq * scale);
                const objetivoWidth = Wreq * scale;
                const objetivoHeight = Hreq * scale;

                // Draw objective piece (red)
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(objetivoX, objetivoY, objetivoWidth, objetivoHeight);
                ctx.strokeRect(objetivoX, objetivoY, objetivoWidth, objetivoHeight);

                // Add objective text (positioned to avoid overlap)
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('OBJETIVO', objetivoX + 6, objetivoY + 16);
                ctx.font = '10px Arial';
                ctx.fillText(`${Hreq.toFixed(2)}x${Wreq.toFixed(2)}`, objetivoX + 6, objetivoY + 28);

                // Draw cut lines
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;

                // Check if vertical cut is needed
                if (Math.abs(dimensionMayor - Wreq) > 0.01) {
                    ctx.beginPath();
                    ctx.moveTo(objetivoX + objetivoWidth, diagramY);
                    ctx.lineTo(objetivoX + objetivoWidth, diagramY + dimensionMenor * scale);
                    ctx.stroke();
                }

                // Check if horizontal cut is needed
                if (Math.abs(dimensionMenor - Hreq) > 0.01) {
                    ctx.beginPath();
                    ctx.moveTo(diagramX, objetivoY);
                    ctx.lineTo(diagramX + dimensionMayor * scale, objetivoY);
                    ctx.stroke();
                }

                // Draw remnants with proper positioning
                remanentes.forEach((remanente, idx) => {
                    let remanenteX, remanenteY, remanenteWidth, remanenteHeight;
                    const remH = parseFloat(remanente.altura_plan || 0);
                    const remW = parseFloat(remanente.ancho_plan || 0);

                    if (idx === 0 && Math.abs(dimensionMenor - Hreq) > 0.01) {
                        // Remnant 1: Upper strip (horizontal cut)
                        remanenteX = diagramX;
                        remanenteY = diagramY;
                        remanenteWidth = dimensionMayor * scale;
                        remanenteHeight = dimensionMenor * scale - (Hreq * scale);
                    } else if ((idx === 1 && Math.abs(dimensionMenor - Hreq) > 0.01 && Math.abs(dimensionMayor - Wreq) > 0.01) ||
                              (idx === 0 && Math.abs(dimensionMenor - Hreq) <= 0.01 && Math.abs(dimensionMayor - Wreq) > 0.01)) {
                        // Remnant 2: Right strip (vertical cut)
                        remanenteX = objetivoX + objetivoWidth;
                        remanenteY = diagramY;
                        remanenteWidth = (dimensionMayor - Wreq) * scale;
                        remanenteHeight = dimensionMenor * scale;
                    }

                    if (remanenteWidth > 0 && remanenteHeight > 0) {
                        ctx.fillStyle = '#90EE90';
                        ctx.fillRect(remanenteX, remanenteY, remanenteWidth, remanenteHeight);
                        ctx.strokeRect(remanenteX, remanenteY, remanenteWidth, remanenteHeight);

                        // Add remnant text (positioned to avoid overlap)
                        ctx.fillStyle = '#000000';
                        ctx.font = 'bold 12px Arial';
                        ctx.fillText(`REM ${idx + 1}`, remanenteX + 6, remanenteY + 16);
                        ctx.font = '10px Arial';
                        ctx.fillText(`${Math.max(remH, remW).toFixed(2)}x${Math.min(remH, remW).toFixed(2)}`, remanenteX + 6, remanenteY + 28);
                    }
                });
            }
        }

        // Draw legend with proper spacing
        const legendY = diagramY + dimensionMenor * scale + 15;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';

        // Legend items
        const legendItems = [
            { color: '#f0f0f0', text: 'Gris: Paño Original' },
            { color: '#ff6b6b', text: 'Rojo: Pieza Objetivo' },
            { color: '#90EE90', text: 'Verde: Remanentes' },
            { color: '#000000', text: 'Líneas Negras: Cortes Guillotina' }
        ];

        legendItems.forEach((item, idx) => {
            const itemY = legendY + idx * 22;
            ctx.fillStyle = item.color;
            ctx.fillRect(diagramX, itemY, 18, 12);
            ctx.strokeRect(diagramX, itemY, 18, 12);
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(item.text, diagramX + 25, itemY + 9);
        });

        // Add target dimensions below legend
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Objetivo: ${Hreq.toFixed(2)}m x ${Wreq.toFixed(2)}m`, diagramX, legendY + 85);

    }, [cut, width, height]);

    return (
        <Paper elevation={3} sx={{ p: 2, display: 'inline-block', borderRadius: 2 }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: width,
                    height: height,
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff'
                }}
            />
        </Paper>
    );
};

export default CutDiagram; 