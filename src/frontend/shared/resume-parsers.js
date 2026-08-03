(function () {
  const utf8Decoder = new TextDecoder("utf-8", { fatal: false });

  async function extractResumeText(file) {
    if (!file) throw new Error("Choose a résumé file first.");
    const extension = file.name.split(".").pop().toLowerCase();
    const buffer = await file.arrayBuffer();

    let text = "";
    if (extension === "docx") text = await extractDocxText(buffer);
    else if (extension === "pdf") text = await extractPdfText(buffer);
    else if (extension === "txt" || file.type.startsWith("text/")) text = utf8Decoder.decode(buffer);
    else throw new Error("Use a DOCX or text-based PDF résumé.");

    text = cleanResumeText(text);
    if (text.length < 80) {
      throw new Error("Very little text was found. For a scanned or image-only PDF, use a text-based PDF or DOCX instead.");
    }
    return text.slice(0, 100000);
  }

  async function extractDocxText(arrayBuffer) {
    const entries = readZipEntries(new Uint8Array(arrayBuffer));
    const wanted = entries.filter((entry) =>
      /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(entry.name)
    );

    if (!wanted.length) throw new Error("This DOCX does not contain a readable Word document.");

    const parts = [];
    for (const entry of wanted) {
      const bytes = await inflateZipEntry(entry);
      const xml = utf8Decoder.decode(bytes);
      parts.push(extractTextFromWordXml(xml));
    }
    return parts.join("\n");
  }

  function readZipEntries(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findSignatureBackwards(view, 0x06054b50, Math.max(0, bytes.length - 66000));
    if (eocd < 0) throw new Error("The DOCX ZIP structure could not be read.");

    const totalEntries = view.getUint16(eocd + 10, true);
    const centralOffset = view.getUint32(eocd + 16, true);
    const entries = [];
    let offset = centralOffset;

    for (let index = 0; index < totalEntries; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
      const name = decodeZipName(nameBytes, Boolean(flags & 0x800));

      if (view.getUint32(localOffset, true) !== 0x04034b50) {
        offset += 46 + nameLength + extraLength + commentLength;
        continue;
      }

      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      entries.push({
        name,
        method,
        compressedSize,
        uncompressedSize,
        data: bytes.slice(dataStart, dataStart + compressedSize)
      });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  function findSignatureBackwards(view, signature, minOffset) {
    for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
      if (view.getUint32(offset, true) === signature) return offset;
    }
    return -1;
  }

  function decodeZipName(bytes, utf8) {
    if (utf8) return utf8Decoder.decode(bytes);
    return bytesToLatin1(bytes);
  }

  async function inflateZipEntry(entry) {
    if (entry.method === 0) return entry.data;
    if (entry.method !== 8) throw new Error(`Unsupported DOCX compression method: ${entry.method}`);
    return decompressBytes(entry.data, ["deflate-raw", "deflate"]);
  }

  function extractTextFromWordXml(xml) {
    return decodeXmlEntities(
      xml
        .replace(/<w:tab\b[^>]*\/?\s*>/gi, "\t")
        .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/gi, "\n")
        .replace(/<\/w:p\s*>/gi, "\n")
        .replace(/<\/w:tr\s*>/gi, "\n")
        .replace(/<\/w:tc\s*>/gi, "\t")
        .replace(/<[^>]+>/g, "")
    );
  }

  function decodeXmlEntities(text) {
    return String(text)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
      .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)));
  }

  async function extractPdfText(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const source = bytesToLatin1(bytes);
    if (!source.startsWith("%PDF")) throw new Error("This file does not appear to be a valid PDF.");
    if (/\/Encrypt\b/.test(source)) throw new Error("Password-protected or encrypted PDFs are not supported. Use DOCX or paste the résumé text.");

    const streams = await decodePdfStreams(bytes, source);
    const allTextStreams = [source, ...streams.map((stream) => stream.text)];
    const contentStreams = streams.length ? streams.map((stream) => stream.text) : [source];
    const cmap = buildGlobalCMap(allTextStreams);
    const extracted = [];

    for (const text of contentStreams) {
      const blocks = text.match(/BT[\s\S]*?ET/g) || [];
      for (const block of blocks) {
        const value = extractPdfContentBlock(block, cmap);
        if (value) extracted.push(value);
      }
    }

    let result = extracted.join("\n");
    if (cleanResumeText(result).length < 80) {
      result += "\n" + extractLoosePdfStrings(allTextStreams, cmap);
    }
    return result;
  }

  async function decodePdfStreams(bytes, source) {
    const results = [];
    const regex = /stream\r?\n/g;
    let match;
    let count = 0;

    while ((match = regex.exec(source)) && count < 800) {
      count += 1;
      const dataStart = match.index + match[0].length;
      const end = source.indexOf("endstream", dataStart);
      if (end < 0) break;

      let dataEnd = end;
      while (dataEnd > dataStart && (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)) dataEnd -= 1;
      const dictStart = Math.max(source.lastIndexOf("<<", match.index), match.index - 2500);
      const dictionary = source.slice(dictStart, match.index);
      const raw = bytes.slice(dataStart, dataEnd);

      try {
        let decoded = raw;
        if (/\/FlateDecode\b|\/Fl\b/.test(dictionary)) {
          decoded = await decompressBytes(raw, ["deflate", "deflate-raw"]);
        } else if (/\/ASCIIHexDecode\b|\/AHx\b/.test(dictionary)) {
          decoded = decodeAsciiHex(bytesToLatin1(raw));
        } else if (/\/ASCII85Decode\b|\/A85\b/.test(dictionary)) {
          decoded = decodeAscii85(bytesToLatin1(raw));
        } else if (/\/Filter\b/.test(dictionary)) {
          regex.lastIndex = end + 9;
          continue;
        }
        results.push({ dictionary, text: bytesToLatin1(decoded) });
      } catch (_) {}

      regex.lastIndex = end + 9;
    }
    return results;
  }

  async function decompressBytes(bytes, formats) {
    let lastError = null;
    for (const format of formats) {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Compressed document data could not be decoded.");
  }

  function decodeAsciiHex(text) {
    const clean = text.replace(/\s+/g, "").replace(/>.*/, "");
    const normalized = clean.length % 2 ? clean + "0" : clean;
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16) || 0;
    return bytes;
  }

  function decodeAscii85(text) {
    const clean = text.replace(/^\s*<~/, "").replace(/~>[\s\S]*$/, "").replace(/\s+/g, "");
    const output = [];
    let group = [];

    for (const char of clean) {
      if (char === "z" && group.length === 0) {
        output.push(0, 0, 0, 0);
        continue;
      }
      const code = char.charCodeAt(0);
      if (code < 33 || code > 117) continue;
      group.push(code - 33);
      if (group.length === 5) {
        appendAscii85Group(group, 4, output);
        group = [];
      }
    }

    if (group.length) {
      const original = group.length;
      while (group.length < 5) group.push(84);
      appendAscii85Group(group, original - 1, output);
    }
    return new Uint8Array(output);
  }

  function appendAscii85Group(group, byteCount, output) {
    let value = 0;
    for (const item of group) value = value * 85 + item;
    const bytes = [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    output.push(...bytes.slice(0, byteCount));
  }

  function buildGlobalCMap(texts) {
    const map = new Map();
    const codeLengths = new Set();

    for (const text of texts) {
      for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
          addCMapEntry(map, codeLengths, pair[1], pair[2]);
        }
      }

      for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
        const body = block[1];
        for (const range of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]+)\])/g)) {
          const start = parseInt(range[1], 16);
          const end = parseInt(range[2], 16);
          const width = range[1].length;
          if (!Number.isFinite(start) || !Number.isFinite(end) || end - start > 2000) continue;

          if (range[3]) {
            let destination = parseInt(range[3], 16);
            const destinationWidth = range[3].length;
            for (let code = start; code <= end; code += 1) {
              addCMapEntry(
                map,
                codeLengths,
                code.toString(16).padStart(width, "0"),
                destination.toString(16).padStart(destinationWidth, "0")
              );
              destination += 1;
            }
          } else {
            const destinations = [...range[4].matchAll(/<([0-9a-fA-F]+)>/g)].map((item) => item[1]);
            for (let code = start, index = 0; code <= end && index < destinations.length; code += 1, index += 1) {
              addCMapEntry(map, codeLengths, code.toString(16).padStart(width, "0"), destinations[index]);
            }
          }
        }
      }
    }

    return { map, lengths: [...codeLengths].sort((a, b) => b - a) };
  }

  function addCMapEntry(map, lengths, sourceHex, destinationHex) {
    const source = sourceHex.toUpperCase();
    const decoded = decodeUnicodeHex(destinationHex);
    if (!decoded) return;
    map.set(source, decoded);
    lengths.add(source.length);
  }

  function decodeUnicodeHex(hex) {
    const clean = hex.replace(/\s+/g, "");
    if (!clean) return "";
    const units = [];
    for (let i = 0; i + 3 < clean.length; i += 4) units.push(parseInt(clean.slice(i, i + 4), 16));
    if (units.length) return String.fromCharCode(...units);
    return String.fromCodePoint(parseInt(clean, 16));
  }

  function extractPdfContentBlock(block, cmap) {
    const stack = [];
    let output = "";
    let index = 0;

    while (index < block.length) {
      index = skipPdfWhitespace(block, index);
      if (index >= block.length) break;
      const char = block[index];

      if (char === "%") {
        const end = block.indexOf("\n", index);
        index = end < 0 ? block.length : end + 1;
        continue;
      }

      if (char === "(") {
        const parsed = parsePdfLiteral(block, index, cmap);
        stack.push(parsed.value);
        index = parsed.next;
        continue;
      }

      if (char === "<" && block[index + 1] !== "<") {
        const end = block.indexOf(">", index + 1);
        if (end < 0) break;
        stack.push(decodePdfHex(block.slice(index + 1, end), cmap));
        index = end + 1;
        continue;
      }

      if (char === "[") {
        const parsed = parsePdfArray(block, index, cmap);
        stack.push(parsed.value);
        index = parsed.next;
        continue;
      }

      if (char === "<" && block[index + 1] === "<") {
        const end = block.indexOf(">>", index + 2);
        index = end < 0 ? block.length : end + 2;
        stack.push({});
        continue;
      }

      const parsedToken = parsePdfToken(block, index);
      index = parsedToken.next;
      const token = parsedToken.value;
      if (!token) continue;

      if (isPdfNumber(token)) {
        stack.push(Number(token));
        continue;
      }

      if (token.startsWith("/")) {
        stack.push(token);
        continue;
      }

      if (token === "Tj") {
        output = appendPdfText(output, lastString(stack));
        stack.length = 0;
      } else if (token === "TJ") {
        output = appendPdfText(output, renderPdfArray(lastArray(stack)));
        stack.length = 0;
      } else if (token === "'" || token === '"') {
        output = appendLineBreak(output);
        output = appendPdfText(output, lastString(stack));
        stack.length = 0;
      } else if (token === "T*" || token === "Td" || token === "TD") {
        output = appendLineBreak(output);
        stack.length = 0;
      } else if (token === "ET") {
        output = appendLineBreak(output);
        stack.length = 0;
      } else if (/^[A-Za-z][A-Za-z0-9*]*$/.test(token)) {
        stack.length = 0;
      } else {
        stack.push(token);
      }
    }

    return cleanPdfText(output);
  }

  function parsePdfArray(text, start, cmap) {
    const values = [];
    let index = start + 1;
    while (index < text.length) {
      index = skipPdfWhitespace(text, index);
      const char = text[index];
      if (char === "]") return { value: values, next: index + 1 };
      if (char === "(") {
        const parsed = parsePdfLiteral(text, index, cmap);
        values.push(parsed.value);
        index = parsed.next;
      } else if (char === "<" && text[index + 1] !== "<") {
        const end = text.indexOf(">", index + 1);
        if (end < 0) return { value: values, next: text.length };
        values.push(decodePdfHex(text.slice(index + 1, end), cmap));
        index = end + 1;
      } else {
        const token = parsePdfToken(text, index);
        if (isPdfNumber(token.value)) values.push(Number(token.value));
        index = token.next;
      }
    }
    return { value: values, next: index };
  }

  function parsePdfLiteral(text, start, cmap) {
    const bytes = [];
    let depth = 1;
    let index = start + 1;

    while (index < text.length && depth > 0) {
      const code = text.charCodeAt(index) & 255;
      const char = text[index];
      if (char === "\\") {
        index += 1;
        if (index >= text.length) break;
        const escaped = text[index];
        const escapedCode = text.charCodeAt(index) & 255;
        const simple = { n: 10, r: 13, t: 9, b: 8, f: 12 };
        if (Object.prototype.hasOwnProperty.call(simple, escaped)) bytes.push(simple[escaped]);
        else if (escaped === "\n") {}
        else if (escaped === "\r") {
          if (text[index + 1] === "\n") index += 1;
        } else if (/[0-7]/.test(escaped)) {
          let octal = escaped;
          while (octal.length < 3 && /[0-7]/.test(text[index + 1] || "")) {
            index += 1;
            octal += text[index];
          }
          bytes.push(parseInt(octal, 8) & 255);
        } else bytes.push(escapedCode);
      } else if (char === "(") {
        depth += 1;
        bytes.push(code);
      } else if (char === ")") {
        depth -= 1;
        if (depth > 0) bytes.push(code);
      } else {
        bytes.push(code);
      }
      index += 1;
    }

    return { value: decodePdfBytes(new Uint8Array(bytes), cmap), next: index };
  }

  function parsePdfToken(text, start) {
    let index = start;
    if (text[index] === "'" || text[index] === '"') return { value: text[index], next: index + 1 };
    while (index < text.length && !/[\s\[\]()<>%]/.test(text[index])) index += 1;
    if (index === start) return { value: text[index], next: index + 1 };
    return { value: text.slice(start, index), next: index };
  }

  function skipPdfWhitespace(text, index) {
    while (index < text.length && /[\s\0]/.test(text[index])) index += 1;
    return index;
  }

  function isPdfNumber(value) {
    return /^[-+]?\d*\.?\d+$/.test(value);
  }

  function lastString(stack) {
    for (let i = stack.length - 1; i >= 0; i -= 1) if (typeof stack[i] === "string" && !stack[i].startsWith("/")) return stack[i];
    return "";
  }

  function lastArray(stack) {
    for (let i = stack.length - 1; i >= 0; i -= 1) if (Array.isArray(stack[i])) return stack[i];
    return [];
  }

  function renderPdfArray(values) {
    let output = "";
    for (const value of values || []) {
      if (typeof value === "string") output = appendPdfText(output, value);
      else if (typeof value === "number" && value < -130 && output && !/\s$/.test(output)) output += " ";
    }
    return output;
  }

  function decodePdfHex(hex, cmap) {
    const clean = hex.replace(/\s+/g, "").toUpperCase();
    if (!clean) return "";
    if (cmap.map.size) {
      let output = "";
      let index = 0;
      while (index < clean.length) {
        let matched = false;
        for (const length of cmap.lengths) {
          const key = clean.slice(index, index + length);
          if (key.length === length && cmap.map.has(key)) {
            output += cmap.map.get(key);
            index += length;
            matched = true;
            break;
          }
        }
        if (!matched) {
          const byteHex = clean.slice(index, index + 2);
          if (byteHex.length === 2) output += String.fromCharCode(parseInt(byteHex, 16));
          index += 2;
        }
      }
      return output;
    }

    const normalized = clean.length % 2 ? clean + "0" : clean;
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16) || 0;
    return decodePdfBytes(bytes, cmap);
  }

  function decodePdfBytes(bytes, cmap) {
    if (cmap.map.size && bytes.length) {
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
      let mapped = "";
      let index = 0;
      let hits = 0;
      while (index < hex.length) {
        let found = false;
        for (const length of cmap.lengths) {
          const key = hex.slice(index, index + length);
          if (key.length === length && cmap.map.has(key)) {
            mapped += cmap.map.get(key);
            index += length;
            hits += 1;
            found = true;
            break;
          }
        }
        if (!found) {
          mapped += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16));
          index += 2;
        }
      }
      if (hits) return mapped;
    }

    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return decodeUtf16Be(bytes.slice(2));
    const zeroEven = bytes.filter((_, index) => index % 2 === 0 && bytes[index] === 0).length;
    if (bytes.length >= 4 && zeroEven >= Math.floor(bytes.length / 4)) return decodeUtf16Be(bytes);
    return bytesToLatin1(bytes);
  }

  function decodeUtf16Be(bytes) {
    let output = "";
    for (let index = 0; index + 1 < bytes.length; index += 2) output += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    return output;
  }

  function appendPdfText(output, value) {
    const text = String(value || "").replace(/\0/g, "").trim();
    if (!text) return output;
    if (!output) return text;
    const previous = output[output.length - 1];
    const next = text[0];
    const needsSpace = /[\p{L}\p{N}]$/u.test(previous) && /^[\p{L}\p{N}]/u.test(next);
    return output + (needsSpace ? " " : "") + text;
  }

  function appendLineBreak(output) {
    if (!output || output.endsWith("\n")) return output;
    return output + "\n";
  }

  function cleanPdfText(text) {
    return String(text || "")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractLoosePdfStrings(texts, cmap) {
    const output = [];
    for (const text of texts) {
      for (const match of text.matchAll(/\((?:\\.|[^\\)]){4,}\)/g)) {
        const parsed = parsePdfLiteral(match[0], 0, cmap).value;
        if (looksLikeHumanText(parsed)) output.push(parsed);
      }
    }
    return output.join("\n");
  }

  function looksLikeHumanText(text) {
    const clean = String(text || "").trim();
    if (clean.length < 4 || clean.length > 500) return false;
    const letters = (clean.match(/[A-Za-z]/g) || []).length;
    return letters / clean.length > 0.45;
  }

  function bytesToLatin1(bytes) {
    let output = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      output += String.fromCharCode(...bytes.subarray(index, Math.min(bytes.length, index + chunk)));
    }
    return output;
  }

  function cleanResumeText(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  window.IceBreakerParsers = {
    extractResumeText,
    extractDocxText,
    extractPdfText,
    cleanResumeText
  };
})();
