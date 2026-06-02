// Helper compartilhado pelas server actions de finance.

// Garante que números venham corretos do formulário
export const parseAmount = (value: FormDataEntryValue | null) => {
  if (!value) return 0;
  const stringValue = value.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
  const float = parseFloat(stringValue);
  return isNaN(float) ? 0 : float;
};
