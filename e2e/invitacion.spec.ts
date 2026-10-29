import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { CONTRASENA, clienteAdmin, completarBienvenida, crearUsuaria, emailUnico, hacerAdmin, iniciarSesion } from './ayudas'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './entorno'

// Mailpit: el buzón falso de Supabase local. Los emails llegan aquí y no a nadie de verdad.
const MAILPIT = 'http://127.0.0.1:54324'

// Espera el email de invitación y devuelve su enlace
async function enlaceDeInvitacion(email: string): Promise<string> {
    for (let intento = 0; intento < 30; intento++) {
        const busqueda = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
        const { messages } = (await busqueda.json()) as { messages?: { ID: string }[] }
        if (messages?.length) {
            const mensaje = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string }
            const enlace = mensaje.HTML.match(/href="([^"]+)"/)?.[1]
            if (enlace) return enlace.replaceAll('&amp;', '&')
        }
        await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error(`No ha llegado la invitación a ${email}. ¿Está Supabase local en marcha?`)
}

test('la admin aprueba una solicitud, llega la invitación y la persona elige su contraseña y entra', async ({ page, browser }) => {
    // Alguien se ha apuntado a la lista de espera
    const invitada = emailUnico('invitada')
    const { error } = await clienteAdmin().from('solicitudes_acceso').insert({ email: invitada })
    if (error) throw new Error(error.message)

    // La admin la aprueba desde su panel
    const emailAdmin = await crearUsuaria()
    await hacerAdmin(emailAdmin, 'Admin')
    await iniciarSesion(page, emailAdmin)
    await completarBienvenida(page, 'Admin')
    await page.goto('/admin/lista-de-espera')
    await page.getByRole('button', { name: `Aprobar e invitar a ${invitada}` }).click()
    await expect(page.getByText(`Invitación enviada a ${invitada} ✓`)).toBeVisible()
    await expect(page.getByRole('button', { name: `Aprobar e invitar a ${invitada}` })).toHaveCount(0)

    // La invitada abre el email en su móvil (otra sesión) y pulsa el enlace
    const enlace = await enlaceDeInvitacion(invitada)
    const suMovil = await browser.newContext()
    const nueva = await suMovil.newPage()
    await nueva.goto(enlace)

    await expect(nueva.getByRole('heading', { name: 'Elige tu contraseña' })).toBeVisible()
    await nueva.getByLabel('Contraseña', { exact: true }).fill('corta')
    await nueva.getByLabel('Repite la contraseña').fill('corta')
    await nueva.getByRole('button', { name: 'Guardar y entrar' }).click()
    await expect(nueva.getByRole('alert')).toContainText('al menos 8')

    await nueva.getByLabel('Contraseña', { exact: true }).fill('residencia-2026')
    await nueva.getByLabel('Repite la contraseña').fill('residencia-2026')
    await nueva.getByRole('button', { name: 'Guardar y entrar' }).click()
    await expect(nueva.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toBeVisible()
    await suMovil.close()

    // Otro día, en otro dispositivo, entra con su contraseña
    const otroDia = await browser.newContext()
    const login = await otroDia.newPage()
    await iniciarSesion(login, invitada, 'residencia-2026')
    await expect(login.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toBeVisible()
    await otroDia.close()
})

test('la función de invitar rechaza a quien no es admin', async () => {
    const url = `${SUPABASE_URL}/functions/v1/invitar`
    const cabeceras = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
    const cuerpo = JSON.stringify({ solicitud_id: '00000000-0000-0000-0000-000000000000' })

    // Sin sesión
    const sinSesion = await fetch(url, { method: 'POST', headers: cabeceras, body: cuerpo })
    expect(sinSesion.status).toBe(401)

    // Con la sesión de una usuaria normal
    const email = await crearUsuaria()
    const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const { data, error } = await cliente.auth.signInWithPassword({ email, password: CONTRASENA })
    if (error || !data.session) throw new Error(error?.message ?? 'Sin sesión')
    const normal = await fetch(url, {
        method: 'POST',
        headers: { ...cabeceras, Authorization: `Bearer ${data.session.access_token}` },
        body: cuerpo,
    })
    expect(normal.status).toBe(403)
})
