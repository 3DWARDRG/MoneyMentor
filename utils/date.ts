/** Timestamp del primer día del mes, con `offsetMonths` hacia atrás. */
export const startOfMonth = (offsetMonths = 0): number => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth() - offsetMonths,
    1,
  ).getTime();
};

/** Timestamp del último día del mes (23:59:59.999), con `offsetMonths` hacia atrás. */
export const endOfMonth = (offsetMonths = 0): number => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth() - offsetMonths + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime();
};
