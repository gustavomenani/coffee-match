import QRCode from "qrcode";

export async function toDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 280 });
}
