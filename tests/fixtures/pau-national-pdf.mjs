// Original test fixture. The only Latin is a short, invented example.
export function examPdf(rows) {
  const escape = text => text.replace(/[\\()]/gu,'\\$&');
  const stream = rows.map((text,i)=>'BT /F1 11 Tf 35 '+(790-i*20)+' Td ('+escape(text)+') Tj ET').join('\n');
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
    '<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'\nendstream'
  ];
  let pdf='%PDF-1.4\n';
  const offsets=[0];
  for (const [i,object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf,'latin1'));
    pdf+=(i+1)+' 0 obj\n'+object+'\nendobj\n';
  }
  const xref=Buffer.byteLength(pdf,'latin1');
  pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+
    'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(pdf,'latin1');
}
