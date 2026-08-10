import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PHASE_LABELS, AREA_LABELS, TaskPhase, TaskArea } from "@/lib/types";

// Genera un .xlsx con la lista de actividades del proyecto, para que se
// pueda llenar el presupuesto de cada una y volver a subirlo. La columna
// "ID" es técnica (así el sistema sabe a qué actividad corresponde cada
// fila al subir el archivo) y no debería borrarse ni cambiarse a mano.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { members: true, tasks: { orderBy: { createdAt: "asc" } } }
  });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const isMember = project.ownerId === user.userId || project.members.some((m) => m.userId === user.userId);
  if (!isMember) return NextResponse.json({ error: "No perteneces a este proyecto" }, { status: 403 });

  const rows = [
    ["ID (no modificar)", "Actividad", "Fase", "Área", "Presupuesto (COP)"],
    ...project.tasks.map((t) => [
      t.id,
      t.title,
      t.phase ? PHASE_LABELS[t.phase as TaskPhase] : "",
      t.area ? AREA_LABELS[t.area as TaskArea] : "",
      t.budget ?? ""
    ])
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 26 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Presupuesto");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `presupuesto-${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
