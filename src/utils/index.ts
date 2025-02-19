export const generateHour = (): string => {
  const date = new Date();
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
};
