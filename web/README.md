# LogisTank Web — integración de funcionalidades Android 1.8

## Estado
Rama de desarrollo. No fusionar ni usar para operaciones reales de carga sin revisión.

### Incorporado
- Apartado Cisternas en navegación web.
- Crear, editar y eliminar cisternas de 2 a 6 compartimentos, capacidades **exactas en litros** e indicación de lado de descarga (izquierda, derecha o ambos).
- Seleccionar cisterna activa y mantenerla entre aperturas en el **mismo navegador y misma cuenta**.
- Botón Cargar desde la ficha de gasolinera; selección de lado admitido tanto por cisterna como estación.
- Planificador volumétrico: un solo producto por compartimento; producto divisible entre varios compartimentos; llenado parcial; sugerencia en función de posiciones de bocas y cruces potenciales estimados.
- Esquema del 1 delantero a N trasero, dibujado **N a 1 de izquierda a derecha**, con cantidades enteras.
- Botón flotante Volver arriba; cabecera web y listas desplazan como una sola página.

### Limitaciones deliberadas
- **NO está sincronizado** el catálogo de cisternas web con Android ni con Google Sheets: los cambios se guardan en localStorage por cuenta y navegador. La implementación de servidor recuperada no permite confirmar la operación `syncTankers`. No se simula sincronización.
- El planificador es **orientativo, exclusivamente volumétrico**. No valida legalmente masa por eje, apoyo en quinta rueda, ADR, tolerancias de llenado, estabilidad, ni trazados reales de manguera. No usar como única base para cargas reales.
- Planificación secuencial de varios clientes y de distintas paradas de un mismo cliente pendiente de implementación y validación.
- Acceso a las listas privadas requiere una implementación de Apps Script que funcione desde el navegador y autorice cada petición en servidor. No exponer secretos ni hojas reales en GitHub.
- Compatibilidad visual, accesibilidad, navegador móvil y sincronización: **pruebas pendientes**.

### Comprobaciones necesarias antes de fusionar
1. Revisar con backend real el contrato de `login`, `getGasStations`, `getRoutes`, y `syncTankers` sin publicar claves ni datos reales.
2. Probar despliegue en entorno aislado; ejecutar pruebas del planificador incluyendo casos no factibles.
3. Asegurar autorización de ediciones, conservación de fichas previas y compatibilidad con el proyecto Android.

## Publicación
GitHub Pages se puede usar como alojamiento de archivos estáticos. **No alojar contraseñas, tokens del servidor, exportaciones de conductores ni datos privados en el repositorio público.**
