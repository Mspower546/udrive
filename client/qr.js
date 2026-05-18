import qrcode from 'qrcode-generator';

export function generateQRCode(text, size = 128) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ scalable: true, margin: 0 });
}
