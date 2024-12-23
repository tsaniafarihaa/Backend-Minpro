import prisma from "src/prisma";

export const updateUserPoints = async (
  userId: string,
  pointsChange: number
) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: pointsChange,
      },
    },
  });
};
