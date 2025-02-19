export const generateHour = (): string => {
  const date = new Date();
  return [(Number(date.getHours()) - 3), date.getMinutes(), date.getSeconds()]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
};
