import type { OfficeInfo } from '@/types';

export function formatRupiah(
    value: number | string | null | undefined,
): string {
    const num = Number(value ?? 0) || 0;
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(num));
}

export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return (
        d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }) +
        ' • ' +
        d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        })
    );
}

export function escapeHtml(str: string | number | null | undefined): string {
    return String(str ?? '').replace(/[&<>"']/g, (ch) => {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return map[ch] ?? ch;
    });
}

export function exportCsv(
    filename: string,
    rows: Record<string, string | number | boolean | null | undefined>[],
): void {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const quote = (v: string | number | boolean | null | undefined) => {
        const s = String(v ?? '');
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
        '\uFEFF' +
        [
            cols.join(';'),
            ...rows.map((r) => cols.map((c) => quote(r[c])).join(';')),
        ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function printDocument(
    title: string,
    subtitle: string,
    bodyHtml: string,
    office: OfficeInfo,
): void {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        window.print();
        return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 28px 36px; font-size: 12.5px; line-height: 1.45; }
  .head { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 18px; }
  .head .office { font-size: 14px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }
  .head .addr { font-size: 11px; color: #444; margin-top: 2px; }
  .head h2 { margin: 10px 0 2px; font-size: 16px; text-transform: uppercase; }
  .head .sub { font-size: 11.5px; color: #555; }
  h3 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  dl { display: grid; grid-template-columns: 180px 1fr; gap: 4px 12px; margin: 0; }
  dt { color: #555; font-weight: 600; }
  dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  .sign-row { margin-top: 34px; display: flex; justify-content: space-between; gap: 24px; }
  .sign-box { text-align: center; min-width: 180px; }
  .sign-line { margin-top: 56px; border-top: 1px solid #666; padding-top: 4px; }
  .amount-box { margin: 16px 0; padding: 12px 16px; border: 2px solid #222; display: inline-block; font-size: 20px; font-weight: 700; }
  .attachment-page { page-break-before: always; break-before: page; page-break-inside: avoid; break-inside: avoid; padding-top: 8px; }
  .attachment-head { border-bottom: 1.5px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 14px; }
  .attachment-title { font-size: 14px; font-weight: 700; }
  .attachment-meta { font-size: 11px; color: #555; margin-top: 3px; }
  .attachment-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; text-align: center; background: #fafafa; }
  .attachment-img { max-width: 100%; max-height: 220mm; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto; }
  .attachment-note { padding: 28px 16px; color: #555; font-size: 12px; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="head">
    <div class="office">${escapeHtml(office.name)}</div>
    <div class="addr">SK Menkumham RI: ${escapeHtml(office.sk_number)} &bull; ${escapeHtml(office.address)}</div>
    <h2>${escapeHtml(title)}</h2>
    <div class="sub">${escapeHtml(subtitle)}</div>
  </div>
  ${bodyHtml}
</body>
</html>`);
    win.document.close();
    win.focus();

    const imgs = Array.from(win.document.images);
    if (imgs.length === 0) {
        setTimeout(() => {
            win.print();
        }, 150);
        return;
    }

    let printed = false;
    const triggerPrint = () => {
        if (printed) return;
        printed = true;
        setTimeout(() => {
            win.print();
        }, 150);
    };

    let remaining = imgs.filter((img) => !img.complete).length;
    if (remaining === 0) {
        triggerPrint();
        return;
    }

    const onDone = () => {
        remaining -= 1;
        if (remaining <= 0) {
            triggerPrint();
        }
    };

    for (const img of imgs) {
        if (!img.complete) {
            img.addEventListener('load', onDone, { once: true });
            img.addEventListener('error', onDone, { once: true });
        }
    }

    setTimeout(triggerPrint, 5000);
}
