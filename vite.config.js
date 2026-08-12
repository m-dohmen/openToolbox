// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Baut die gesamte Anwendung in eine einzige dist/index.html.
 *
 * Zwei Fallstricke, die hier bewusst adressiert sind:
 *
 * 1. `base: './'` – ohne relative Basis zeigen Pfade auf den Serverroot und
 *    laufen unter file:// ins Leere.
 * 2. `removeViteModuleLoader` NICHT setzen – die Option leert in dieser
 *    Kombination den inline-Script-Block und man erhält eine leere Datei.
 *
 * Der bekannte CORS-Fehler bei Vite-Builds unter file:// betrifft nur
 * nachgeladene Module. Nach dem Inlining lädt nichts mehr nach, deshalb kann
 * `type="module"` stehen bleiben – und bringt gleich das Defer-Verhalten mit,
 * so dass #app beim Start existiert.
 */
export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
