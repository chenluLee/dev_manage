import { useSensors, useSensor, MouseSensor, TouchSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

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
