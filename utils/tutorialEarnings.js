export const PLATFORM_FEE_RATE = 0.2;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumAmounts = (items = []) =>
  items.reduce((total, item) => total + toNumber(item?.amount), 0);

export const getTutorialAmount = (purchase, tutorialMap = {}) => {
  const directAmount = toNumber(purchase?.amount);

  if (directAmount > 0) return directAmount;

  return toNumber(tutorialMap[purchase?.tutorialId]);
};

export const summarizeTutorFinances = ({
  tutorials = [],
  purchases = [],
  withdrawals = [],
} = {}) => {
  const tutorialMap = Object.fromEntries(
    tutorials.map((tutorial) => [tutorial.id, toNumber(tutorial.price)])
  );

  const approvedPurchases = purchases.filter(
    (purchase) => purchase?.status === "approved"
  );

  const pendingPurchases = purchases.filter(
    (purchase) => purchase?.status === "pending"
  );

  const grossRevenue = approvedPurchases.reduce(
    (total, purchase) =>
      total + getTutorialAmount(purchase, tutorialMap),
    0
  );

  const platformFee = grossRevenue * PLATFORM_FEE_RATE;
  const creatorGrossBalance = grossRevenue - platformFee;

  const approvedWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal?.status === "approved"
  );

  const pendingWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal?.status === "pending"
  );

  const withdrawnAmount = sumAmounts(approvedWithdrawals);
  const reservedAmount = sumAmounts(pendingWithdrawals);

  const withdrawableBalance = Math.max(
    0,
    creatorGrossBalance - withdrawnAmount - reservedAmount
  );

  return {
    totalTutorials: tutorials.length,
    totalSales: approvedPurchases.length,
    pendingSales: pendingPurchases.length,
    grossRevenue,
    platformFee,
    creatorGrossBalance,
    withdrawnAmount,
    reservedAmount,
    withdrawableBalance,
  };
};
