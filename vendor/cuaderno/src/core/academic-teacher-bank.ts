/** Punto de entrada offline al snapshot congelado de los repertorios docentes.
 * El import no ejecuta migraciones ni modificaciones de cuadernos.
 */
import { TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1 } from '../data/teacher-academic-snapshot.js';
import { importTeacherAcademicSources } from './academic-teacher-adapter.js';

export const academicTeacherSnapshotV1 = TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1;
export function createOfflineTeacherBankV1() {
  return importTeacherAcademicSources(academicTeacherSnapshotV1);
}
