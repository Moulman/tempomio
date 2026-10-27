#!/bin/bash
# Hook PreToolUse (Bash) de Claude Code: bloquea acciones que podrían tocar producción.
# Exit 2 = bloquear; el mensaje de stderr se le muestra a Claude.
# Si bloquea algo legítimo, ejecútalo tú a mano en tu terminal.

INPUT=$(cat)
if command -v jq >/dev/null 2>&1; then
    CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
else
    CMD="$INPUT"
fi
[ -z "$CMD" ] && exit 0

block() {
    echo "BLOQUEADO por .claude/hooks/protect-production.sh: $1" >&2
    exit 2
}

BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)
has() { printf '%s' "$CMD" | grep -Eq "$1"; }

# 1. Push: nunca a main/master, nunca force, nunca estando en main
if has 'git[[:space:]]+([^|;&]*[[:space:]])?push([[:space:]]|$)'; then
    has '(^|[[:space:]:/+])(main|master)([[:space:]]|$)' && block "push a main/master. Producción la actualiza Mouldi a mano."
    has '(--force([^-]|$)|--force-with-lease|[[:space:]]-[a-zA-Z]*f[a-zA-Z]*([[:space:]]|$))' && block "force-push."
    { [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; } && block "push estando en la rama $BRANCH."
fi

# 2. Cambiar la historia o hacer commits estando en main
if has 'git[[:space:]]+([^|;&]*[[:space:]])?(commit|merge|rebase|cherry-pick|revert|reset)([[:space:]]|$)'; then
    { [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; } && block "modificar la historia estando en $BRANCH. Cambia a una rama de trabajo."
fi

# 3. Cambiar a main (podría seguir con commits ahí)
has 'git[[:space:]]+(checkout|switch)[[:space:]]+(-[a-zA-Z-]+[[:space:]]+)*(main|master)([[:space:]]|$)' && block "cambiar a main. Si hace falta, hazlo tú."

# 4. Secretos
has 'git[[:space:]]+add([[:space:]]+[^|;&]*)?[[:space:]](\./)?\.env([[:space:]]|$)' && block "añadir .env al commit."

# 5. Base de datos de producción
has 'supabase[[:space:]]+(db[[:space:]]+(push|reset)|link|migration[[:space:]]+repair|projects)' && block "comando de Supabase que puede afectar a producción. Ejecútalo tú, en el proyecto correcto."
has '(^|[[:space:]])(psql|pg_dump|pg_restore)([[:space:]]|$)' && block "acceso directo a Postgres."
if has 'supabase\.co'; then
    has '(-X[[:space:]]*(POST|PUT|PATCH|DELETE)|--request[[:space:]]+(POST|PUT|PATCH|DELETE)|--data|[[:space:]]-d[[:space:]])' && block "escritura contra la API de Supabase."
fi

# 6. Despliegues
has 'vercel[[:space:]]+([^|;&]*[[:space:]])?(--prod|promote|deploy)' && block "despliegue con Vercel. Producción sale solo de main y lo hace Mouldi."

exit 0
