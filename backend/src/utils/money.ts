const allowedVatRates = [0, 5.5, 10, 20] as const;

export function assertVatRate(rate: number) {
  if (!allowedVatRates.includes(rate as (typeof allowedVatRates)[number])) {
    throw new Error("Taux de TVA invalide.");
  }
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceAmounts(amountHt: number, vatRate: number) {
  assertVatRate(vatRate);

  const vatAmount = roundMoney(amountHt * (vatRate / 100));
  const amountTtc = roundMoney(amountHt + vatAmount);

  return {
    vatAmount,
    amountTtc
  };
}

