<img src="docs/social-preview.png" alt="openToolbox" width="100%">

# openToolbox

[English](README.md) · [Deutsch](README.de.md) · [中文](README.zh.md) · **Español** · [Français](README.fr.md) · [日本語](README.ja.md) · [Português](README.pt.md)

**Entrega una herramienta interna funcional como un único archivo HTML. Sin servidor, sin
instalación, sin red.**

openToolbox es una plantilla para herramientas internas pequeñas que necesitan viajar — por correo,
memoria USB o unidad compartida — y ejecutarse con doble clic en un portátil corporativo bloqueado.
El archivo *es* a la vez la aplicación y la base de datos: al guardar se escribe un nuevo archivo
HTML con los datos incrustados dentro.

Está pensada para una forma de trabajar en concreto:

> «Créame una herramienta para hacer seguimiento de auditorías de proveedores, basada en openToolbox.»

Se apunta un agente de IA a este repositorio y ya tiene todo lo necesario: el marco de trabajo y el
archivo [`AGENTS.md`](AGENTS.md), que le indica exactamente qué preguntar y qué archivo modificar.

Se puede acortar un paso más con el skill de [`plugin/`](plugin/): instalado una vez, describes la
herramienta que quieres en cualquier directorio y el agente se trae la plantilla solo. Claude Code y
Codex leen el mismo `SKILL.md` — instalación en [`plugin/README.md`](plugin/README.md). No es
obligatorio: la frase de arriba funciona sin él.

---

## Verlo en funcionamiento

[**Abrir la demo en vivo**](https://m-dohmen.github.io/openToolbox/demo/) — una cartera de proyectos
con dos tipos de registro enlazados. O [descargar `docs/demo/index.html`](docs/demo/index.html) y
hacer doble clic. El mismo archivo; en ninguno de los dos casos interviene un servidor.

![La vista de lista](docs/screenshots/list.png)

Dos tipos de registro que se referencian entre sí, columnas calculadas, filtros que cuentan y la
versión junto al título. Todo lo anterior sale de un único archivo: `src/domain.js`.

![El panel](docs/screenshots/dashboard.png)

El panel informa sobre ambos tipos de registro. Dibujado **sin biblioteca de gráficos**: las barras
son anchuras CSS y el anillo es un único círculo SVG. Ambas vistas se imprimen como un PDF limpio.

---

## Qué incluye

- **Un archivo.** Unos 160 KB, autocontenido. Doble clic y funciona. Desconecta el cable de red y
  sigue funcionando; lo único que echaría en falta es el [contador de aperturas](#el-contador-de-aperturas),
  y está a un interruptor visible de quedar apagado.
- **El archivo es la base de datos.** Guardar escribe un nuevo HTML con los registros incrustados.
  Sin backend, sin almacenamiento del navegador, sin sincronización.
- **Cifrado opcional.** AES-256-GCM, con clave derivada mediante PBKDF2 y 310.000 iteraciones. Sin
  la contraseña, el archivo es un bloque ilegible.
- **Asistente de IA opcional.** Se apunta a cualquier endpoint compatible con OpenAI. Lee los datos,
  acepta archivos adjuntos como contexto adicional y —solo ante una instrucción explícita— propone
  cambios que apruebas antes de que se apliquen.
- **Personalizable.** Cinco colores, nombre de producto y un logotipo SVG, todo editable en la
  aplicación y guardado con el archivo.
- **Modo claro y oscuro**, atajos de teclado, exportación a CSV y JSON, usable hasta el ancho de un
  teléfono.
- **Importación de CSV con asignación de columnas**, para que los datos reales entren sin teclearlos
  de nuevo.
- **Dos idiomas de interfaz** (inglés, alemán) en una preferencia que viaja con el archivo.
- **Varios tipos de registro y relaciones entre ellos**, cuando uno solo no basta.
- **Paneles e impresión**, porque el análisis suele acabar en una diapositiva o en un anexo.
- **Un widget de fechas límite en el panel**, activado con un solo campo del esquema — vencidas,
  esta semana, próximos 30 días — agregado entre todas las entidades que lo declaran.
- **Un registro de cambios**, rellenado en cada guardado con fecha, versión y qué cambió.
- **Prompts de ejemplo incrustados**, para que quien reciba el archivo pueda hacerlo modificar sin
  haber leído esta página.
- **Un bloqueo de la página de ajustes**, para que una herramienta en manos de quien solo introduce
  datos no se reconfigure por accidente.
- **Una línea de cabecera editable y hasta cinco enlaces** en la barra oscura superior, apuntando a
  lo que acompaña a la herramienta.
- **Reglas de validación entre campos**, aplicadas igual en el formulario, en la importación CSV y
  en los cambios que propone la IA.
- **Un asistente de captura guiada** y un modo de recepción que abre el archivo directamente en él,
  para quien solo tiene que reportar una cosa.
- **Fusionar una copia devuelta**, registro por registro y con comparación campo a campo.
- **Un registro de cambios a nivel de campo**, deducido automáticamente en cada guardado: qué registro, qué campo, antes y después.
- **Adjuntos con un presupuesto de tamaño visible**, porque una herramienta que ya no se puede enviar por correo deja de ser esta herramienta.
- **Una página de inicio editable**, para que el archivo se explique antes de mostrar una tabla.
- **Deshacer/rehacer para la sesión**, para cada creación, edición y borrado, con Ctrl/Cmd+Z y
  Ctrl/Cmd+Y o los dos botones de la barra del archivo.

## Inicio rápido

```bash
git clone https://github.com/m-dohmen/openToolbox
cd openToolbox
npm install
npm run build     # → dist/index.html
```

Abre `dist/index.html` en un navegador. Eso es todo.

## Construir tu propia herramienta

Todo lo específico del dominio vive en **un archivo**: `src/domain.js`. Se sustituye, se reconstruye
y ya está.

```js
export const SCHEMA = {
  singular: 'risk',
  plural: 'risks',
  titleField: 'name',
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],
  facets: ['likelihood', 'category'],
  fields: [
    { key: 'name', label: 'Riesgo', type: 'text', required: true },
    { key: 'category', label: 'Categoría', type: 'enum', values: ['Operativo', 'Legal', 'TI'] },
    { key: 'review', label: 'Fecha de revisión', type: 'date' },
    { key: 'impact', label: 'Impacto', type: 'number' },
  ],
}
```

Un campo también puede ser **calculado** en lugar de almacenado:

```js
{ key: 'score', label: 'Puntuación', type: 'computed', compute: (r) => r.likelihood * r.impact }
```

`compute(record)` se ejecuta en cada renderizado y el resultado **nunca se escribe en el registro**.
Ese es justamente el punto: un valor derivado que se almacena queda desfasado en cuanto cambia
alguna de sus entradas, y nadie se entera. Aun así se puede ordenar y buscar por él, suma en el
recuento general y aparece en la exportación CSV; en el formulario es de solo lectura, y a la IA se
le indica que lo es y se le rechaza por su nombre si intenta escribirlo.

Ese esquema por sí solo genera las columnas de la tabla, el formulario de edición, los filtros
laterales, la exportación CSV, las instrucciones que se envían al modelo de IA y la validación de
cualquier cosa que el modelo proponga de vuelta.

## Varios tipos de registro y relaciones

La mayoría de herramientas necesitan un solo tipo de registro. En cuanto realmente haya dos o más
que se referencien entre sí (proveedores y sus certificados, proyectos y sus hitos), se exporta
`ENTITIES` y se añade un campo `type: 'reference'` en el que apunta al otro.

En el formulario, un campo de referencia se muestra como una lista desplegable de los registros
destino; en la tabla, como una marca pulsable con el título del destino. Al pulsarla, la aplicación
cambia a ese tipo y abre el registro. Borrar un registro todavía referenciado queda bloqueado, y el
mensaje indica exactamente qué lo referencia.

`examples/portfolio.domain.js` —el origen de la demo de arriba— usa todas las funciones a la vez.

## Cómo entran los datos

**Importación de CSV con paso de asignación.** Eliges un archivo y el diálogo lista cada columna
detectada junto a un desplegable con los campos. Las columnas cuyo encabezado coincide con la
etiqueta o la clave de un campo vienen preseleccionadas, ignorando mayúsculas y puntuación. El resto
se asigna a mano y lo no asignado se queda fuera. Puedes añadir a lo existente o reemplazarlo todo.

El separador (`;`, coma, tabulador), el entrecomillado y un BOM inicial se detectan a partir del
propio archivo, así que una exportación de Excel funciona sin preparación previa. Cada celda pasa
por la misma comprobación de tipos que un cambio propuesto por la IA. **Nada falla en silencio**: la
pantalla de resultado nombra cada objeción con su número de línea, un valor incorrecto en una celda
deja intacto el resto de la fila, y una fila sin título se omite en lugar de importarse a medias.

Los identificadores los asigna siempre la aplicación, nunca se toman del archivo.

## Versiones y registro de cambios

**La versión** es texto libre en los ajustes: `1.4`, `2026-T3`, `versión final para el comité`.
Aparece como una marca junto al título y se incorpora al nombre del archivo guardado
(`project-portfolio-2.1-2026-08-15.html`), de modo que en un hilo de correo con cuatro adjuntos se
reconoce el archivo correcto sin abrir ninguno.

**El registro de cambios** escribe una entrada por guardado: marca de tiempo, versión y una nota que
se pide en un diálogo breve al guardar. Las entradas viven junto a los registros, no junto a los
ajustes, así que en un archivo cifrado el registro queda **dentro** del sobre cifrado, que es donde
corresponde a una nota como «presupuesto corregido tras el hallazgo de auditoría».

## Prompts de ejemplo

El archivo construido explica cómo modificarse. En los puntos que normalmente se querrían ajustar
—la cabecera, la tabla, los filtros, el panel, el formulario, la importación CSV, la zona de IA— hay
un recuadro en el color de atención que indica qué genera esa parte y ofrece un prompt listo para
entregar a un agente de IA, con botón de copiar.

La idea: quien recibe el archivo no necesita haber leído esta página, ni saber que existe
`src/domain.js`, para conseguir que la herramienta se modifique.

Viene activado, porque el trabajo de una plantilla es enseñar. **Conviene desactivarlo antes de
entregar una herramienta terminada a alguien que solo va a introducir datos**: ahí los recuadros son
ruido.

## Por qué un solo archivo

Tres restricciones que aparecen una y otra vez en entornos regulados y corporativos:

- Alojar una herramienta pequeña implica un servidor, una URL, un responsable de operaciones y, por
  lo general, una revisión de seguridad.
- Instalar cualquier cosa exige permisos de administrador que el usuario no tiene.
- Los datos no pueden salir de la máquina.

Un único archivo HTML esquiva las tres. Y es honesto sobre lo que es: el usuario puede leer todo el
código fuente, y no hay ningún servicio que pueda cambiar a sus espaldas.

## Bloquear los ajustes

Ajustes → Seguridad → *Proteger los ajustes* pide una palabra y desactiva todos los controles de esa
página. Los campos siguen **visibles y sus valores legibles**: el mensaje es «ahora no», no «no es
asunto tuyo». La misma palabra los reactiva durante la sesión actual; al reabrir el archivo vuelven
a estar bloqueados, para que la protección no desaparezca en silencio tras el primer guardado del
autor.

**Es una protección contra descuidos, no una frontera de seguridad.** Quien tiene el archivo tiene
el código, y la entrada del bloqueo se puede borrar del bloque de datos con un editor de texto. Es
una tapa sobre un interruptor. Para lo que de verdad nadie debe leer está el cifrado, que sí es
real.

La palabra tampoco es una contraseña. Se guarda como un resumen SHA-256 con sal para que no quede en
texto plano dentro del archivo, pero el campo la muestra abiertamente a propósito: para una tapa
nadie debería reutilizar una contraseña de verdad, y «123» sirve. No hay regla de complejidad.

## El contador de aperturas

Lo único en un archivo construido que sale a la red por iniciativa propia. Al abrirse envía una sola
petición GET con **el tipo de herramienta** (`SCHEMA.singular`, por ejemplo `action item`). Nada
más: ni registros, ni contenido de campos, ni nombre de archivo, ni nada de lo que se haya escrito.

Tres decisiones deliberadas, porque un archivo así acaba en manos de gente que no lo construyó:

- **El endpoint es un ajuste visible y editable**, preconfigurado con el contador de quien hizo la
  plantilla. Se puede apuntar al propio o vaciar el campo para no contar nada. El ajuste viaja con
  el archivo.
- **Es un interruptor etiquetado** en Ajustes → Seguridad, con la dirección de destino escrita al
  lado. No es un píxel oculto.
- **La ruta lleva el tipo de herramienta, nunca el nombre del archivo.** Ese nombre lo puede cambiar
  el destinatario y en la práctica lleva nombres de clientes; enviarlo a un tercero sería filtrar
  algo que pertenece a quien recibió el archivo.

Con el contador apagado y la integración de IA apagada, el archivo **no** abre ninguna conexión de
red. Verificable en el panel de red del navegador, y comprobado por la batería de pruebas.

## Límites que conviene conocer

- **Lo que no se guarda, se pierde.** No hay guardado automático: sin un archivo de destino no puede
  haberlo. El punto ámbar y el aviso al cerrar la pestaña son la única red de seguridad. Ctrl/Cmd+S
  guarda.
- **Una máquina, un archivo.** No hay modo multiusuario. Dos personas editando el mismo archivo
  producen dos verdades distintas.
- **Las pasarelas de correo filtran los adjuntos `.html`** más veces de las que no. Envíalo
  comprimido o por transferencia de archivos, y prueba el camino una vez con un archivo de prueba
  antes de que importe de verdad.
- **El cifrado protege los datos, no el acceso a la aplicación.** Roles y vistas dentro de un archivo
  que se ejecuta localmente serían solo apariencia: quien tiene el archivo tiene el código.

## Licencia

Apache License 2.0. Los archivos fuente llevan una cabecera `SPDX-License-Identifier`.

Dependencias: Preact (MIT), Vite (MIT) y Playwright solo para pruebas (Apache 2.0). El archivo
construido no carga nada en tiempo de ejecución.

---

> **Sobre esta traducción**: el [README en inglés](README.md) es la versión de referencia; si algo
> difiere, prevalece aquél. La documentación detallada (arquitectura, funcionamiento interno de la
> integración de IA, seguridad) está en la [wiki](https://github.com/m-dohmen/openToolbox/wiki), solo
> en inglés.


<img src="docs/logo.svg" alt="openToolbox logo" width="96" height="96">
