import { extraDelDia, minutosTrabajados } from './schedule'
import type { Fichaje, HorarioDia } from './schedule'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// 450 → "7:30", -25 → "-0:25" (formato que Excel entiende como horas)
function hm(mins: number): string {
    const signo = mins < 0 ? '-' : ''
    const abs = Math.abs(mins)
    return `${signo}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

// Entre comillas si hace falta (separador, comillas o saltos de línea en notas)
function celda(valor: string): string {
    return /[;"\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

// CSV de un mes: una fila por día fichado y una fila final de totales.
// Separador ";" y BOM para que Excel en español lo abra con columnas y acentos correctos.
export function csvDelMes(fichajes: Fichaje[], horariosPorDia: (HorarioDia | null)[]): string {
    const filas: string[][] = [['Fecha', 'Día', 'Entrada', 'Salida', 'Trabajado', 'Bolsa usada', 'Previsto', 'Extra', 'Nota']]
    let totalTrabajado = 0
    let totalPrevisto = 0
    let totalExtra = 0
    let totalBolsa = 0

    for (const f of [...fichajes].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        const d = new Date(f.fecha + 'T00:00:00')
        const horario = horariosPorDia[d.getDay()]
        const previsto = horario?.activo ? minutosTrabajados(horario.hora_entrada, horario.hora_salida) : 0
        const completo = !!f.hora_entrada && !!f.hora_salida
        const trabajado = completo ? minutosTrabajados(f.hora_entrada, f.hora_salida) : 0
        const extra = completo ? extraDelDia(f, horario) : 0
        const bolsa = f.bolsa_minutos ?? 0
        totalBolsa += bolsa
        if (completo) {
            totalTrabajado += trabajado
            totalPrevisto += previsto
            totalExtra += extra
        }
        filas.push([
            d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            DIAS[d.getDay()],
            f.hora_entrada?.slice(0, 5) ?? '',
            f.hora_salida?.slice(0, 5) ?? '',
            completo ? hm(trabajado) : '',
            bolsa ? hm(bolsa) : '',
            hm(previsto),
            completo ? hm(extra) : '',
            f.nota ?? '',
        ])
    }

    filas.push(['Total', '', '', '', hm(totalTrabajado), hm(totalBolsa), hm(totalPrevisto), hm(totalExtra), ''])
    return '﻿' + filas.map((fila) => fila.map(celda).join(';')).join('\r\n') + '\r\n'
}

export function descargarArchivo(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    // Margen para que el navegador empiece la descarga antes de liberar el blob
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
