export const getTodayEpochSeconds = () => {
  const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const endOfDay = Math.floor(new Date().setHours(23, 59, 59, 999) / 1000);

  return { startOfDay, endOfDay };
};