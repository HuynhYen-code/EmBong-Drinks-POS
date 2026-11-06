const zlib = require('zlib');

// Bảng CRC32 tiêu chuẩn cho định dạng ZIP (.xlsx OOXML)
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZipBuffer(files) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
        const nameBuf = Buffer.from(file.name, 'utf8');
        const rawBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
        const compressed = zlib.deflateRawSync(rawBuf);
        const crc = crc32(rawBuf);

        // Local File Header (30 bytes + filename)
        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034B50, 0); // Signature
        localHeader.writeUInt16LE(20, 4);         // Version needed (2.0)
        localHeader.writeUInt16LE(0x0800, 6);     // UTF-8 filename flag
        localHeader.writeUInt16LE(8, 8);          // Compression method: DEFLATE (8)
        localHeader.writeUInt16LE(0, 10);         // Mod time
        localHeader.writeUInt16LE(0x5821, 12);    // Mod date
        localHeader.writeUInt32LE(crc, 14);       // CRC-32
        localHeader.writeUInt32LE(compressed.length, 18); // Compressed size
        localHeader.writeUInt32LE(rawBuf.length, 22);     // Uncompressed size
        localHeader.writeUInt16LE(nameBuf.length, 26);    // Filename length
        localHeader.writeUInt16LE(0, 28);                 // Extra field length

        localParts.push(localHeader, nameBuf, compressed);

        // Central Directory File Header (46 bytes + filename)
        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014B50, 0); // Signature
        centralHeader.writeUInt16LE(20, 4);         // Version made by
        centralHeader.writeUInt16LE(20, 6);         // Version needed
        centralHeader.writeUInt16LE(0x0800, 8);     // UTF-8 flag
        centralHeader.writeUInt16LE(8, 10);         // Compression: DEFLATE
        centralHeader.writeUInt16LE(0, 12);         // Mod time
        centralHeader.writeUInt16LE(0x5821, 14);    // Mod date
        centralHeader.writeUInt32LE(crc, 16);       // CRC-32
        centralHeader.writeUInt32LE(compressed.length, 20);
        centralHeader.writeUInt32LE(rawBuf.length, 24);
        centralHeader.writeUInt16LE(nameBuf.length, 28);
        centralHeader.writeUInt16LE(0, 30);         // Extra length
        centralHeader.writeUInt16LE(0, 32);         // Comment length
        centralHeader.writeUInt16LE(0, 34);         // Disk number
        centralHeader.writeUInt16LE(0, 36);         // Internal attrs
        centralHeader.writeUInt32LE(0, 38);         // External attrs
        centralHeader.writeUInt32LE(offset, 42);    // Relative offset of local header

        centralParts.push(centralHeader, nameBuf);
        offset += localHeader.length + nameBuf.length + compressed.length;
    }

    const centralDirBuf = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054B50, 0);          // EOCD signature
    eocd.writeUInt16LE(0, 4);                   // Disk number
    eocd.writeUInt16LE(0, 6);                   // Start disk
    eocd.writeUInt16LE(files.length, 8);        // Entries on disk
    eocd.writeUInt16LE(files.length, 10);       // Total entries
    eocd.writeUInt32LE(centralDirBuf.length, 12); // Central directory size
    eocd.writeUInt32LE(offset, 16);             // Offset of start of central directory
    eocd.writeUInt16LE(0, 20);                  // Comment length

    return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function escapeXml(val) {
    return String(val ?? '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function colIndexToLetter(colIdx1Based) {
    let n = colIdx1Based;
    let s = '';
    while (n > 0) {
        const mod = (n - 1) % 26;
        s = String.fromCharCode(65 + mod) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

// Danh sách Style ID dùng trong cellXfs của styles.xml
const STYLES = {
    DEFAULT: 0,
    TITLE: 1,          // Chữ to đậm màu xanh thương hiệu #4A6741
    SUBTITLE: 2,       // Chữ phụ nghiêng xám
    SECTION: 3,        // Tiêu đề nhóm bảng đậm nền xám nhạt
    HEADER_LEFT: 4,    // Header bảng nền xanh #4A6741 chữ trắng căn trái
    HEADER_RIGHT: 5,   // Header bảng nền xanh #4A6741 chữ trắng căn phải
    HEADER_CENTER: 6,  // Header bảng nền xanh #4A6741 chữ trắng căn giữa
    TEXT: 7,           // Ô dữ liệu text có viền
    CENTER: 8,         // Ô dữ liệu căn giữa có viền
    CURRENCY: 9,       // Ô tiền tệ #,##0 "₫" có viền
    INT: 10,           // Ô số nguyên #,##0 có viền
    PERCENT: 11,       // Ô phần trăm 0.0% có viền
    TOTAL_LABEL: 12,   // Dòng tổng cộng: nhãn đậm nền xanh nhạt
    TOTAL_CURRENCY: 13,// Dòng tổng cộng: tiền đậm nền xanh nhạt
    TOTAL_INT: 14,     // Dòng tổng cộng: số nguyên đậm nền xanh nhạt
    TOTAL_PERCENT: 15, // Dòng tổng cộng: phần trăm đậm nền xanh nhạt
    TEXT_WRAP: 16      // Ô text dài tự xuống dòng có viền
};

function buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0&quot; ₫&quot;"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0.0%"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="15"/><color rgb="FF4A6741"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FF1E293B"/><name val="Arial"/></font>
    <font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FF2F4F28"/><name val="Arial"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4A6741"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEEF5EC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="17">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
  </cellXfs>
</styleSheet>`;
}

/**
 * Mỗi cell có thể là:
 *   - null / undefined (ô trống)
 *   - primitive string / number
 *   - { v: value, s: styleId, t?: 'n' | 'str' }
 */
function buildWorksheetXml(sheet) {
    const colWidths = sheet.columns || [];
    const colsXml = colWidths.length > 0
        ? `<cols>${colWidths.map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
        : '';

    const rowsXml = [];
    const rows = sheet.rows || [];

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const rowObj = rows[rIdx];
        const cells = Array.isArray(rowObj) ? rowObj : (rowObj.cells || []);
        const heightAttr = rowObj && !Array.isArray(rowObj) && rowObj.height
            ? ` ht="${rowObj.height}" customHeight="1"`
            : '';

        const rowNum = rIdx + 1;
        const cellXmlList = [];

        for (let cIdx = 0; cIdx < cells.length; cIdx++) {
            const raw = cells[cIdx];
            if (raw === null || raw === undefined) continue;

            const isObj = typeof raw === 'object';
            const val = isObj ? raw.v : raw;
            const style = isObj && raw.s !== undefined ? raw.s : STYLES.DEFAULT;
            const ref = `${colIndexToLetter(cIdx + 1)}${rowNum}`;

            if (val === null || val === undefined || val === '') {
                if (style !== STYLES.DEFAULT) {
                    cellXmlList.push(`<c r="${ref}" s="${style}"/>`);
                }
                continue;
            }

            const isNumeric = (isObj && raw.t === 'n') || (typeof val === 'number' && Number.isFinite(val));
            if (isNumeric) {
                cellXmlList.push(`<c r="${ref}" s="${style}"><v>${val}</v></c>`);
            } else {
                cellXmlList.push(`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(val)}</t></is></c>`);
            }
        }

        rowsXml.push(`<row r="${rowNum}"${heightAttr}>${cellXmlList.join('')}</row>`);
    }

    const merges = sheet.merges || [];
    const mergeXml = merges.length > 0
        ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
        : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>${rowsXml.join('')}</sheetData>
  ${mergeXml}
</worksheet>`;
}

function sanitizeSheetName(name, fallbackIdx) {
    const cleaned = String(name || `Sheet${fallbackIdx}`)
        .replace(/[:\\/?*\[\]]/g, '')
        .trim()
        .slice(0, 31);
    return cleaned || `Sheet${fallbackIdx}`;
}

function buildXlsxWorkbook(sheets) {
    const files = [];

    // 1. [Content_Types].xml
    const sheetOverrides = sheets.map((_, idx) =>
        `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ).join('');

    files.push({
        name: '[Content_Types].xml',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`
    });

    // 2. _rels/.rels
    files.push({
        name: '_rels/.rels',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    });

    // 3. xl/workbook.xml
    const sheetsXml = sheets.map((s, idx) =>
        `<sheet name="${escapeXml(sanitizeSheetName(s.name, idx + 1))}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
    ).join('');

    files.push({
        name: 'xl/workbook.xml',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsXml}</sheets>
</workbook>`
    });

    // 4. xl/_rels/workbook.xml.rels
    const wbRels = sheets.map((_, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
    ).join('');

    files.push({
        name: 'xl/_rels/workbook.xml.rels',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRels}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    });

    // 5. xl/styles.xml
    files.push({
        name: 'xl/styles.xml',
        data: buildStylesXml()
    });

    // 6. Worksheets
    sheets.forEach((sheet, idx) => {
        files.push({
            name: `xl/worksheets/sheet${idx + 1}.xml`,
            data: buildWorksheetXml(sheet)
        });
    });

    return createZipBuffer(files);
}

module.exports = {
    STYLES,
    buildXlsxWorkbook
};

