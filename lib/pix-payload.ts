// Gerador do payload PIX "copia e cola" (BR Code / EMV-MPM do Banco Central).
// Puro e isomórfico: usado no PDF de cobrança (QR Code) e onde mais precisar.
// Referência: Manual de Padrões para Iniciação do PIX (BCB), formato EMV QRCPS-MPM.

export interface PixPayloadInput {
  /** Chave PIX do recebedor (e-mail, CPF/CNPJ, telefone +55… ou chave aleatória). */
  key: string;
  /** Nome do recebedor (vai truncado/sem acentos para até 25 chars). */
  merchantName: string;
  /** Cidade do recebedor (até 15 chars; "BRASIL" funciona nos bancos). */
  merchantCity?: string;
  /** Valor em reais. Omitido = o pagador digita o valor. */
  amount?: number;
  /** Identificador da transação (A-Za-z0-9, até 25). Default "***" (livre). */
  txid?: string;
}

/** Campo EMV: ID(2) + tamanho(2) + valor. */
function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** Remove acentos e caracteres fora do conjunto aceito pelos bancos. */
function sanitize(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/** CRC16-CCITT (FALSE): polinômio 0x1021, init 0xFFFF — exigido pelo BR Code. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Monta o payload PIX estático. O retorno é o texto do "copia e cola" e o
 * conteúdo do QR Code — qualquer app de banco lê.
 */
export function buildPixPayload({ key, merchantName, merchantCity = "BRASIL", amount, txid = "***" }: PixPayloadInput): string {
  const cleanKey = key.trim();
  const name = sanitize(merchantName, 25) || "RECEBEDOR";
  const city = sanitize(merchantCity, 15) || "BRASIL";
  const cleanTxid = txid.replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***";

  const merchantAccount = emv("00", "BR.GOV.BCB.PIX") + emv("01", cleanKey);

  let payload =
    emv("00", "01") + // Payload Format Indicator
    emv("26", merchantAccount) + // Merchant Account Information (PIX)
    emv("52", "0000") + // Merchant Category Code (não informado)
    emv("53", "986"); // Moeda: BRL

  if (amount != null && amount > 0) payload += emv("54", amount.toFixed(2));

  payload +=
    emv("58", "BR") +
    emv("59", name) +
    emv("60", city) +
    emv("62", emv("05", cleanTxid)) +
    "6304"; // ID + tamanho do CRC (o valor entra no cálculo)

  return payload + crc16(payload);
}
