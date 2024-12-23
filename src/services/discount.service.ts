interface DiscountCalculationParams {
  user: any;
  totalPrice: number;
  usePoints: boolean;
  useCoupon: boolean;
}

export const calculateDiscounts = async ({
  user,
  totalPrice,
  usePoints,
  useCoupon,
}: DiscountCalculationParams) => {
  let pointsDiscount = 0;
  let couponDiscount = 0;
  let isValid = true;

  if (usePoints && user.points >= 10000) {
    const usablePoints = Math.floor(user.points / 10000) * 10000;
    pointsDiscount = usablePoints;
  }

  if (useCoupon && user.usercoupon && !user.usercoupon.isRedeem) {
    couponDiscount = totalPrice * 0.1;
  }

  if (pointsDiscount + couponDiscount > totalPrice) {
    isValid = false;
  }

  return {
    pointsDiscount,
    couponDiscount,
    isValid,
  };
};
