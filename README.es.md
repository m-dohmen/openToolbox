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
- **Un registro de cambios**, rellenado en cada guardado con fecha, versión y qué cambió.
- **Prompts de ejemplo incrustados**, para que quien reciba el archivo pueda hacerlo modificar sin
  haber leído esta página.

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
