"use client";

import { useState } from "react";
import { ProjectDetail, Task, BOARD_MODE_COLUMNS } from "@/lib/types";
import KanbanBoard from "@/components/KanbanBoard";
import GanttChart from "@/components/GanttChart";
import BudgetTab from "@/components/BudgetTab";
import ReportsTab from "@/components/ReportsTab";

type View = "board" | "gantt" | "budget" | "reports";

const TABS: { key: View; label: string }[] = [
  { key: "board", label: "Tablero" },
  { key: "gantt", label: "Cronograma" },
  { key: "budget", label: "Presupuesto" },
  { key: "reports", label: "Informes de obra" }
];

export default function ProjectTabs({
  project,
  currentUserId,
  canManage = false
}: {
  project: ProjectDetail;
  currentUserId: string;
  canManage?: boolean;
}) {
  const [view, setView] = useState<View>("board");
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const statusOptions = BOARD_MODE_COLUMNS[project.boardMode || "TASKS"];

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              view === tab.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "board" && (
        <KanbanBoard project={project} currentUserId={currentUserId} tasks={tasks} setTasks={setTasks} />
      )}
      {view === "gantt" && (
        <GanttChart
          tasks={tasks}
          setTasks={setTasks}
          projectId={project.id}
          members={project.members}
          statusOptions={statusOptions}
        />
      )}
      {view === "budget" && <BudgetTab projectId={project.id} tasks={tasks} setTasks={setTasks} />}
      {view === "reports" && <ReportsTab projectId={project.id} canManage={canManage} />}
    </div>
  );
}
