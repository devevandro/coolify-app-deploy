export const generateHour = () => {
  const date = new Date();
  const hours = date.getHours() < 10 ? date.getHours() : date.getHours();
  const minutes =
    date.getMinutes() < 10 ? date.getMinutes() : date.getMinutes();
  const seconds =
    date.getSeconds() < 10 ? date.getSeconds() : date.getSeconds();

  return `${hours}:${minutes}:${seconds}`;
};
