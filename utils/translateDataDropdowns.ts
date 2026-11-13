import {
  useStatisticsData,
  type Period,
  PERIODS,
  type TypeTransactions,
  TRANSACTIONSTYPES,
} from "@/hooks/useStatisticsData";
import { DropdownOption } from "@/components/Dropdown";
export const EVENTSTATUST = ["pending" , "paid" , "overdue" , "cancelled"] as const ;
export type EventStatusT = (typeof EVENTSTATUST)[number];
export const EVENTRECURRENCET = ["none" , "daily" , "weekly" , "monthly" , "yearly"] as const;
export type EventRecurrenceT = ( typeof EVENTRECURRENCET)[number]



export  const TRANSACTIONS_ES: Record<TypeTransactions, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

export   const transactionsTypesES: DropdownOption<TypeTransactions>[] =
    TRANSACTIONSTYPES.map((p) => ({
      label: TRANSACTIONS_ES[p],
      value: p,
    }));

export  const periodOptions: DropdownOption<Period>[] = PERIODS.map((p) => ({
    label: p,
    value: p,
  }));


  export const EVENT_STATUS_ES: Record<EventStatusT, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Cancelado'
};

export const eventStatusOptionsES: DropdownOption<EventStatusT>[] =
  EVENTSTATUST.map((status) => ({
    label: EVENT_STATUS_ES[status],
    value: status
  }));

  export const EVENT_RECURRENCE_ES: Record<EventRecurrenceT, string> = {
  none: 'Sin repetición', // O 'Ninguna', lo que prefieras para la UI
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual'
};

export const eventRecurrenceOptionsES: DropdownOption<EventRecurrenceT>[] =
  EVENTRECURRENCET.map((recurrence) => ({
    label: EVENT_RECURRENCE_ES[recurrence],
    value: recurrence
  }));