export const formatFinancial = (amount, token = 'USDC') => {
  const fixed = Number(amount || 0).toFixed(2);
  return {
    tokenLine: `${fixed} ${token}`,
    usdLine: `≈ $${fixed} USD`,
  };
};
