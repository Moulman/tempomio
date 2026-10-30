import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { CONTRASENA, clienteAdmin, completarBienvenida, crearUsuaria, emailUnico, enlaceDelEmail, hacerAdmin, iniciarSesion } from './ayudas'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './entorno'

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

    // El enlace lleva a la página /aceptar de TempoMio, no directamente a Supabase
    const enlace = await enlaceDelEmail(invitada, 'Te han invitado a TempoMio')
    expect(enlace).toContain('/aceptar?token_hash=')

    // Un filtro de correo «abre» el enlace para revisarlo: no debe gastarlo
    await fetch(enlace)

    // La invitada abre el email en su móvil (otra sesión) y acepta
    const suMovil = await browser.newContext()
    const nueva = await suMovil.newPage()
    await nueva.goto(enlace)
    await expect(nueva.getByRole('heading', { name: 'Te han invitado a TempoMio' })).toBeVisible()
    await nueva.getByRole('button', { name: 'Aceptar la invitación' }).click()

    await expect(nueva.getByRole('heading', { name: 'Elige tu contraseña' })).toBeVisible()
    await nueva.getByLabel('Contraseña', { exact: true }).fill('12345')
    await nueva.getByLabel('Repite la contraseña').fill('12345')
    await nueva.getByRole('button', { name: 'Guardar y entrar' }).click()
    await expect(nueva.getByRole('alert')).toContainText('al menos 6')

    await nueva.getByLabel('Contraseña', { exact: true }).fill('residencia-2026')
    await nueva.getByLabel('Repite la contraseña').fill('residencia-2026')
    await nueva.getByRole('button', { name: 'Guardar y entrar' }).click()
    await expect(nueva.getByRole('heading', { name: '¡Te damos la bienvenida a TempoMio!' })).toBeVisible()
    await suMovil.close()

    // El mismo enlace, usado otra vez, ya no sirve y lo dice claramente
    const otraVez = await browser.newContext()
    const repetida = await otraVez.newPage()
    await repetida.goto(enlace)
    await repetida.getByRole('button', { name: 'Aceptar la invitación' }).click()
    await expect(repetida.getByRole('heading', { name: 'Este enlace ya no sirve' })).toBeVisible()
    await otraVez.close()

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

test('si la invitación no se ha aceptado, «Reenviar» manda un enlace nuevo que funciona', async ({ page, browser }) => {
    const invitada = emailUnico('reenvio')
    const { error } = await clienteAdmin().from('solicitudes_acceso').insert({ email: invitada })
    if (error) throw new Error(error.message)

    const emailAdmin = await crearUsuaria()
    await hacerAdmin(emailAdmin, 'Admin')
    await iniciarSesion(page, emailAdmin)
    await completarBienvenida(page, 'Admin')
    await page.goto('/admin/lista-de-espera')
    await page.getByRole('button', { name: `Aprobar e invitar a ${invitada}` }).click()
    await expect(page.getByText(`Invitación enviada a ${invitada} ✓`)).toBeVisible()
    const primerEnlace = await enlaceDelEmail(invitada, 'Te han invitado a TempoMio', 1)

    // No la acepta: la admin la reenvía
    await page.getByRole('button', { name: /Ver procesadas/ }).click()
    await page.getByRole('button', { name: `Reenviar la invitación a ${invitada}` }).click()
    await expect(page.getByText(`Invitación enviada a ${invitada} ✓`)).toBeVisible()
    const segundoEnlace = await enlaceDelEmail(invitada, 'Te han invitado a TempoMio', 2)
    expect(segundoEnlace).not.toBe(primerEnlace)

    // El enlace nuevo funciona
    const suMovil = await browser.newContext()
    const nueva = await suMovil.newPage()
    await nueva.goto(segundoEnlace)
    await nueva.getByRole('button', { name: 'Aceptar la invitación' }).click()
    await expect(nueva.getByRole('heading', { name: 'Elige tu contraseña' })).toBeVisible()
    await suMovil.close()
})

test('«Reenviar» nunca borra una cuenta que ya tiene datos, aunque tenga la marca de contraseña pendiente', async ({ page }) => {
    // Una trabajadora con perfil y saldo (ha pasado la bienvenida)...
    const trabajadora = await crearUsuaria()
    const suMovil = await page.context().browser()!.newContext()
    const movil = await suMovil.newPage()
    await iniciarSesion(movil, trabajadora)
    await completarBienvenida(movil, 'Rosa')
    await suMovil.close()

    // ...que tiene la marca puesta (recuperación a medias, o se la puso ella misma)
    const admin = clienteAdmin()
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const usuaria = lista.users.find((u) => u.email === trabajadora)!
    await admin.auth.admin.updateUserById(usuaria.id, { user_metadata: { contrasena_pendiente: true } })

    // Su email aparece en la lista de espera (cualquiera puede apuntar un email)
    const { error } = await admin.from('solicitudes_acceso').insert({ email: trabajadora, estado: 'aprobada' })
    if (error) throw new Error(error.message)

    const emailAdmin = await crearUsuaria()
    await hacerAdmin(emailAdmin, 'Admin')
    await iniciarSesion(page, emailAdmin)
    await completarBienvenida(page, 'Admin')
    await page.goto('/admin/lista-de-espera')
    await page.getByRole('button', { name: /Ver procesadas/ }).click()
    await page.getByRole('button', { name: `Reenviar la invitación a ${trabajadora}` }).click()
    await expect(page.getByRole('alert')).toContainText('ya tiene cuenta')

    // La cuenta y sus datos siguen ahí
    const { data: perfil } = await admin.from('perfiles').select('nombre').eq('id', usuaria.id).maybeSingle()
    expect(perfil?.nombre).toBe('Rosa')
})
