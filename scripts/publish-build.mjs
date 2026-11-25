import { mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Replace the generated output only after the new build is complete. */
export async function publishBuild(staging, output) {
  if (!(await stat(staging)).isDirectory()) throw Error('No existe una compilación completa.');
  const backupDir = await mkdtemp(join(dirname(output), '.dist-previous-'));
  const previous = join(backupDir, 'dist');
  let moved = false;
  let preserve = false;
  try {
    try {
      await rename(output, previous);
      moved = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await rename(staging, output);
    } catch (error) {
      if (moved) {
        try { await rename(previous, output); }
        catch (restoreError) {
          preserve = true;
          throw new AggregateError([error, restoreError], 'No se pudo restaurar dist; copia anterior conservada en ' + previous);
        }
      }
      throw error;
    }
  } finally {
    if (!preserve) await rm(backupDir, { recursive: true, force: true });
  }
}
