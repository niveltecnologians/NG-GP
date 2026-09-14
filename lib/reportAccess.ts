// Reglas de visibilidad y permisos de los informes de avance (ProgressReport),
// en el mismo espíritu que lib/taskAccess.ts para las tareas: el dueño del
// proyecto, los administradores y el gerente administran todos los informes
// de todas las áreas. Cualquier otro con un área de trabajo asignada solo
// puede crear y administrar los informes de esa misma área (los informes
// "generales", sin área, quedan solo para quien administra todo el
// proyecto). El portal del cliente NO usa nada de este archivo: ahí siempre
// se ven todos los informes publicados, de todas las áreas, juntos.

export type ReportAccessUser = {
  userId: string;
  role: "ADMIN" | "MEMBER" | "CONTABILIDAD" | "GERENTE";
  areaId: string | null;
  seesAllAreas: boolean;
};

export type ReportAccessProject = { ownerId: string };

// Igual que canManageProjectTasks: quien puede administrar el proyecto
// completo (y por lo tanto todos sus informes, de cualquier área).
export function canManageProjectReports(project: ReportAccessProject, user: ReportAccessUser) {
  return project.ownerId === user.userId || user.role === "ADMIN" || user.role === "GERENTE";
}

// Si el usuario puede crear/publicar un informe para el área indicada
// (o un informe general, con areaId null).
export function canCreateReportForArea(
  project: ReportAccessProject,
  user: ReportAccessUser,
  areaId: string | null
): boolean {
  if (canManageProjectReports(project, user) || user.seesAllAreas) return true;
  if (areaId === null) return false;
  return user.areaId !== null && user.areaId === areaId;
}

// Si el usuario puede editar/publicar/borrar un informe puntual ya
// existente: quien administra el proyecto, quien "ve todas las áreas",
// quien tiene la misma área del informe, o quien lo escribió.
export function canManageSingleReport(
  project: ReportAccessProject,
  user: ReportAccessUser,
  report: { areaId: string | null; authorId: string | null }
): boolean {
  if (canManageProjectReports(project, user) || user.seesAllAreas) return true;
  if (user.areaId && report.areaId === user.areaId) return true;
  return !!report.authorId && report.authorId === user.userId;
}

// Qué informes puede VER un usuario dentro del proyecto (pantalla interna
// del equipo, no el portal del cliente): quien administra todo o ve todas
// las áreas los ve todos. Cualquier otro ve los generales (sin área), los
// de su propia área, y los que escribió él mismo aunque ya no tenga esa
// área asignada.
export function visibleProjectReports<T extends { areaId: string | null; authorId: string | null }>(
  reports: T[],
  project: ReportAccessProject,
  user: ReportAccessUser
): T[] {
  if (canManageProjectReports(project, user) || user.seesAllAreas) return reports;
  return reports.filter(
    (r) => r.areaId === null || r.areaId === user.areaId || r.authorId === user.userId
  );
}

