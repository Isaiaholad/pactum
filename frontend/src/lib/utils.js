export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export function formatCurrency(amount, currency = 'USDC') {
  const value = Number(amount || 0);
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount || 0));
}
