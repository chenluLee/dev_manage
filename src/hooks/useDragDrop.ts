import { useSensors, useSensor, MouseSensor, TouchSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Project } from "@/types";

export function useDndSensors() {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  return sensors;
}

export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const updated = array.slice();
  const [item] = updated.splice(from, 1);
  updated.splice(to, 0, item);
  return updated;
}

// 为项目排序提供专门的工具函数
export function moveProject(projects: Project[], fromIndex: number, toIndex: number): Project[] {
  const sortedProjects = arrayMove(projects, fromIndex, toIndex);
  
  // 重新计算order值，确保排序的一致性
  return sortedProjects.map((project, index) => ({
    ...project,
    order: index,
    updatedAt: new Date().toISOString()
  }));
}

// 根据order字段对项目进行排序
export function sortProjectsByOrder(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));
}
