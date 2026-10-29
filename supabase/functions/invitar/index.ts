// ============================================================
// Edge Function «invitar»: la admin aprueba una solicitud de la lista de
// espera y se envía la invitación por email.
//
// Se ejecuta en el servidor de Supabase. Es el ÚNICO sitio donde se usa la
// clave secreta (crear cuentas la necesita): nunca va en la app.
//
// Comprobaciones, en este orden:
//   1. La petición trae una sesión válida (la valida el servidor de Auth)
//   2. Esa persona es admin (se lee de la base de datos, no de la petición)
//   3. La solicitud existe
// Después invita, marca la solicitud como aprobada y responde.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

// La sesión va en la cabecera Authorization; CORS no protege nada aquí, solo
// deja que el navegador haga la petición desde la app
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respuesta(cuerpo: Record<string, unknown>, estado = 200): Response {
    return new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    })
}

// Claves nuevas (SUPABASE_SECRET_KEYS, un JSON) o antiguas (SUPABASE_SERVICE_ROLE_KEY)
function claveSecreta(): string {
    const nuevas = Deno.env.get('SUPABASE_SECRET_KEYS')
    if (nuevas) return JSON.parse(nuevas).default
    const antigua = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!antigua) throw new Error('Falta la clave secreta en el entorno de la función')
    return antigua
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return respuesta({ error: 'Método no permitido' }, 405)

    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return respuesta({ error: 'Falta la sesión' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, claveSecreta(), {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1. ¿Quién llama?
    const { data: { user }, error: errorSesion } = await admin.auth.getUser(token)
    if (errorSesion || !user) return respuesta({ error: 'Sesión no válida' }, 401)

    // 2. ¿Es admin?
    const { data: perfil } = await admin.from('perfiles').select('es_admin').eq('id', user.id).maybeSingle()
    if (perfil?.es_admin !== true) return respuesta({ error: 'Solo la admin puede invitar' }, 403)

    // 3. ¿Qué solicitud? (y a dónde debe volver el enlace del email)
    let cuerpo: { solicitud_id?: unknown; volver_a?: unknown }
    try {
        cuerpo = await req.json()
    } catch {
        return respuesta({ error: 'Petición no válida' }, 400)
    }
    if (typeof cuerpo.solicitud_id !== 'string') return respuesta({ error: 'Falta solicitud_id' }, 400)

    const { data: solicitud } = await admin
        .from('solicitudes_acceso')
        .select('id, email, nombre')
        .eq('id', cuerpo.solicitud_id)
        .maybeSingle()
    if (!solicitud) return respuesta({ error: 'No existe esa solicitud' }, 404)

    // 4. Invitación. `contrasena_pendiente` hace que la app le pida elegir
    // contraseña al entrar. `redirectTo` solo se acepta si está en la lista de
    // URLs permitidas de Supabase (Authentication → URL Configuration).
    const { error: errorInvitar } = await admin.auth.admin.inviteUserByEmail(solicitud.email, {
        data: { contrasena_pendiente: true, ...(solicitud.nombre ? { nombre: solicitud.nombre } : {}) },
        redirectTo: typeof cuerpo.volver_a === 'string' ? cuerpo.volver_a : undefined,
    })
    if (errorInvitar) {
        const yaTieneCuenta = errorInvitar.code === 'email_exists' || /already been registered/i.test(errorInvitar.message)
        return yaTieneCuenta
            ? respuesta({ error: `${solicitud.email} ya tiene cuenta` }, 409)
            : respuesta({ error: `No se pudo enviar la invitación: ${errorInvitar.message}` }, 500)
    }

    // 5. Marcar la solicitud como aprobada
    const { error: errorEstado } = await admin
        .from('solicitudes_acceso')
        .update({ estado: 'aprobada' })
        .eq('id', solicitud.id)
    if (errorEstado) {
        return respuesta({ error: 'La invitación se envió, pero no se pudo marcar la solicitud como aprobada' }, 500)
    }

    return respuesta({ ok: true, email: solicitud.email })
})
