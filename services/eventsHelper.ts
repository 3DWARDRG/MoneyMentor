// Shim temporal: delega al nuevo eventService.
// Se elimina cuando las pantallas de recordatorios migren a custom hooks.
export {
  createEventWithNotification as createExpenseEventWithNotification,
  updateEvent as updateExpenseEvent,
  deleteEvent as deleteExpenseEvent,
} from "@/services/eventService";
