import "server-only";
import QRCode from "qrcode";

/**
 * QR codes are rendered server-side and handed to the kiosk as a data URL.
 *
 * Rendering here keeps the qrcode library out of the client bundle, and lets
 * the colours be tuned for a phone camera pointed at a bright screen in a dark
 * room: maximum contrast, generous quiet zone, and error correction high
 * enough to survive glare and a smudged touchscreen.
 */
export async function renderQrDataUrl(target: string): Promise<string> {
  return QRCode.toDataURL(target, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 640,
    color: { dark: "#050507ff", light: "#ffffffff" },
  });
}
