// "Dead goal" detection (RF7.3): a goal that is still active but has no active
// tasks — declared but not being worked on. Pure.

export type GoalActivity = {
  id: string;
  status: "active" | "done" | "abandoned";
  activeTaskCount: number;
};

export function findDeadGoals(goals: GoalActivity[]): string[] {
  return goals.filter((g) => g.status === "active" && g.activeTaskCount === 0).map((g) => g.id);
}

export function isDeadGoal(goal: GoalActivity): boolean {
  return goal.status === "active" && goal.activeTaskCount === 0;
}
