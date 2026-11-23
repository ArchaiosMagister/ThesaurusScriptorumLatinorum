# Sincronización Supabase — fase 1 (diseño, no activada)

**Objetivo:** conservar IndexedDB como fuente local de trabajo y sincronizar biblioteca,
cuadernos, vocabulario, etiquetas, imágenes de portada e historial, sin sobrescrituras
silenciosas. No se utiliza OneDrive ni se modifica la aplicación estable.

## Estado y decisiones de seguridad

- Esta fase contiene el planificador de sincronización y pruebas locales. **No conecta con
  ninguna base de datos ni activa autenticación ni transmite datos.**
- Los proyectos Supabase que ya existen sirven a otras apps; **ninguno se usa ni se modifica
  sin seleccionar expresamente el proyecto de destino**. La cuenta de Supabase Dashboard
  no implica por sí sola que exista en ese proyecto un usuario docente en Auth.
- Antes del primer envío: revisar permiso del proyecto, configurar el login de docente,
  ejecutar comprobaciones RLS de dos usuarios, generar copia JSON verificada,
  comparar conteos/IDs/hash de los dos dispositivos y presentar vista previa.
- Si el mismo ID tiene contenidos distintos en Mac y iPad, presentar **conflicto** y permitir
  conservar ambas versiones, nunca «última modificación gana».
- No realizar borrados automáticos ni propagar una ausencia como una instrucción de borrado.
- La copia local debe quedar íntegra tras un fallo HTTP, de sesión, conectividad o cuota.
- Mantener la clave **secreta/service_role siempre en servidor**; una app estática solo
  utiliza la clave publicable y la sesión de usuario con políticas RLS.
- No reutilizar objetos de otras webapps. Prefijo de tablas exclusivo del cuaderno.

## Modelo lógico propuesto

El motor divide un snapshot local coherente en documentos separados:
- «corpus/primary»: banco de textos, etiquetas y pertenencia a cuadernos clásicos;
- «edition/ID»: edición completa de cada cuaderno, con texto, vocabulario y portada;
- «history/ID»: secuencia histórica de cambios del cuaderno.

Los campos de revisión de IndexedDB **no son** revisiones del servidor. Cada fila del
servidor mantiene su propia revisión para detectar escrituras concurrentes.
Los checkpoints por usuario/dispositivo representan el último contenido confirmado en ambos
extremos y se anotarán localmente solo tras finalizar la transferencia segura.

## Esquema de la primera conexión (NO EJECUTADO)

El transporte inicial usa una copia atómica del workspace completo, con revision
CAS en la base de datos. La granularidad por cuaderno está diseñada en
supabase-sync-plan.ts, pero todavía no es el transporte activo.

Este SQL corresponde al cliente y **no se ha aplicado en ningún proyecto**:

    create table public.cuaderno_sync_workspaces (
      owner_id uuid primary key references auth.users(id) on delete cascade,
      revision bigint not null default 1 check (revision >= 1),
      payload jsonb not null check (jsonb_typeof(payload) = 'object'),
      updated_at timestamptz not null default now(),
      constraint workspace_payload_limit check (octet_length(payload::text) <= 12000000)
    );
    alter table public.cuaderno_sync_workspaces enable row level security;
    revoke all on public.cuaderno_sync_workspaces from anon;
    grant select, insert, update on public.cuaderno_sync_workspaces to authenticated;
    create policy cuaderno_workspace_select on public.cuaderno_sync_workspaces
      for select to authenticated using (owner_id = (select auth.uid()));
    create policy cuaderno_workspace_insert on public.cuaderno_sync_workspaces
      for insert to authenticated with check (owner_id = (select auth.uid()));
    create policy cuaderno_workspace_update on public.cuaderno_sync_workspaces
      for update to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));

La inserción usa la clave única owner_id. Las actualizaciones usan comparación
de owner_id y revision: cero filas modificadas significa conflicto, nunca éxito.
No se concede DELETE. Clave publicable y usuario autenticado con RLS; jamás
service_role o contraseña en el código.

La primera versión es manual: iniciar sesión, revisar los cambios, descargar
copia JSON, autorizar subir o descargar. Los conflictos se detienen sin
sobrescribir. IndexedDB conserva la operación sin conexión. La sesión y sus
tokens viven solo en memoria; la URL, clave publicable y hash de la última
sincronización se guardan localmente. No hay aún sincronización automática,
cola persistente ni resolución granular automática de conflictos.

## Etapas siguientes, con puertas de aprobación

1. Elegir proyecto Supabase y configurar el acceso privado; desplegar las tablas en un
   entorno de prueba **solo tras autorización**.
2. Implementar transportes autenticados, checkpoints duraderos, cola offline y estados
   «local», «pendiente», «sincronizado» y «conflicto», sin importar nada todavía.
3. Probar restauración, desconexión, dos dispositivos que editan el mismo pasaje,
   portadas grandes y migraciones con copias independientes.
4. Con consentimiento específico, activar la primera subida de los cuadernos reales.
   Cualquier conflicto mantiene ambas copias y solicita decisión docente.
5. Fusionar y publicar **solo** cuando CI, auditoría de seguridad y pruebas de regresión
   sean verdes; el despliegue de producción es independiente de la fase de pruebas.
