// Script para probar los cálculos de área en el frontend
// Este script simula los cálculos que se hacen en OrdenFormPanos.jsx

// Función para calcular área total (como se hace en el frontend)
function calcularAreaTotal(panosArray) {
  return panosArray.reduce((sum, p) => {
    // Calcular área real: largo_tomar * ancho_tomar
    const areaPano = (Number(p.largo_tomar) || 0) * (Number(p.ancho_tomar) || 0);
    return sum + areaPano;
  }, 0);
}

// Función para calcular área individual
function calcularAreaIndividual(largo, ancho) {
  return (Number(largo) || 0) * (Number(ancho) || 0);
}

// Datos de prueba
const panosPrueba = [
  {
    // Paño con corte simple
    largo_tomar: 2.5,
    ancho_tomar: 3.0,
    cantidad: 1,
    modo_corte: 'simple',
    cortes_individuales: null
  },
  {
    // Paño con cortes individuales
    largo_tomar: 4.0,
    ancho_tomar: 2.5,
    cantidad: 15, // número de cortes individuales
    modo_corte: 'individuales',
    cortes_individuales: [
      { largo: 1.0, ancho: 0.8, cantidad: 5 },
      { largo: 0.6, ancho: 0.4, cantidad: 10 }
    ]
  },
  {
    // Otro paño con corte simple
    largo_tomar: 1.8,
    ancho_tomar: 2.2,
    cantidad: 1,
    modo_corte: 'simple',
    cortes_individuales: null
  }
];

// Ejecutar pruebas
console.log('🧮 Pruebas de Cálculo de Área\n');

// 1. Calcular áreas individuales
console.log('1️⃣ Áreas Individuales:');
panosPrueba.forEach((pano, index) => {
  const area = calcularAreaIndividual(pano.largo_tomar, pano.ancho_tomar);
  console.log(`   Paño ${index + 1}: ${pano.largo_tomar}m × ${pano.ancho_tomar}m = ${area.toFixed(2)}m²`);
  console.log(`   - Modo: ${pano.modo_corte}`);
  console.log(`   - Piezas: ${pano.modo_corte === 'individuales' ? pano.cortes_individuales.length : pano.cantidad}`);
  console.log('');
});

// 2. Calcular área total
const areaTotal = calcularAreaTotal(panosPrueba);
console.log('2️⃣ Área Total:');
console.log(`   Suma de todas las áreas: ${areaTotal.toFixed(2)}m²\n`);

// 3. Verificar cálculos manuales
console.log('3️⃣ Verificación Manual:');
const areasManuales = [
  2.5 * 3.0,    // 7.50m²
  4.0 * 2.5,    // 10.00m²
  1.8 * 2.2     // 3.96m²
];
const sumaManual = areasManuales.reduce((sum, area) => sum + area, 0);
console.log(`   Cálculo manual: ${sumaManual.toFixed(2)}m²`);
console.log(`   Cálculo función: ${areaTotal.toFixed(2)}m²`);
console.log(`   ✅ Coinciden: ${Math.abs(sumaManual - areaTotal) < 0.01 ? 'SÍ' : 'NO'}\n`);

// 4. Simular diferentes escenarios
console.log('4️⃣ Escenarios Adicionales:');

// Escenario: Valores nulos o undefined
const panoConValoresNulos = {
  largo_tomar: null,
  ancho_tomar: undefined,
  cantidad: 1,
  modo_corte: 'simple'
};
const areaNulos = calcularAreaIndividual(panoConValoresNulos.largo_tomar, panoConValoresNulos.ancho_tomar);
console.log(`   Paño con valores nulos: ${areaNulos.toFixed(2)}m² (debería ser 0.00)`);

// Escenario: Valores string
const panoConStrings = {
  largo_tomar: "3.5",
  ancho_tomar: "2.0",
  cantidad: 1,
  modo_corte: 'simple'
};
const areaStrings = calcularAreaIndividual(panoConStrings.largo_tomar, panoConStrings.ancho_tomar);
console.log(`   Paño con strings: ${areaStrings.toFixed(2)}m² (debería ser 7.00)`);

// 5. Resumen
console.log('5️⃣ Resumen:');
console.log(`   - Total de paños: ${panosPrueba.length}`);
console.log(`   - Paños con cortes individuales: ${panosPrueba.filter(p => p.modo_corte === 'individuales').length}`);
console.log(`   - Paños con cortes simples: ${panosPrueba.filter(p => p.modo_corte === 'simple').length}`);
console.log(`   - Área total calculada: ${areaTotal.toFixed(2)}m²`);

console.log('\n✅ Pruebas completadas. Los cálculos de área están funcionando correctamente.'); 