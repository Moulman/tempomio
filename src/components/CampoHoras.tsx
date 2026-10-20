interface Props {
    horas: string
    minutos: string
    onHoras: (v: string) => void
    onMinutos: (v: string) => void
    // Con signo: a favor (+) o en contra (−)
    negativo?: boolean
    onNegativo?: (v: boolean) => void
    etiquetas?: [string, string]
}

// Horas y minutos en dos casillas, con selector de signo opcional
export default function CampoHoras({
    horas, minutos, onHoras, onMinutos, negativo, onNegativo, etiquetas = ['A favor', 'En contra'],
}: Props) {
    return (
        <div className="space-y-2">
            {onNegativo && (
                <div className="grid grid-cols-2 gap-1 p-1 bg-fondo rounded-lg">
                    {[false, true].map((valor, i) => (
                        <button
                            key={etiquetas[i]}
                            type="button"
                            onClick={() => onNegativo(valor)}
                            className={`py-1.5 rounded-md text-sm ${negativo === valor ? 'bg-superficie shadow-sm font-medium' : 'text-tinta-suave'}`}
                        >
                            {etiquetas[i]}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-2 text-sm text-tinta-suave">
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={horas}
                    onChange={(e) => onHoras(e.target.value)}
                    placeholder="0"
                    aria-label="Horas"
                    className="w-20 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                />
                <span>h</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    value={minutos}
                    onChange={(e) => onMinutos(e.target.value)}
                    placeholder="0"
                    aria-label="Minutos"
                    className="w-20 bg-fondo border border-linea rounded-lg px-2 py-2 text-base text-tinta"
                />
                <span>min</span>
            </div>
        </div>
    )
}
