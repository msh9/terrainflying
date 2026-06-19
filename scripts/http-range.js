export function parseByteRange(rangeHeader, fileSize) {
  if (typeof rangeHeader !== "string" || rangeHeader.trim().length === 0) {
    return undefined;
  }

  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const [, startRaw, endRaw] = match;
  if (startRaw.length === 0 && endRaw.length === 0) {
    return null;
  }

  if (startRaw.length === 0) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }
    const start = Math.max(fileSize - suffixLength, 0);
    const end = fileSize - 1;
    return { start, end };
  }

  const start = Number.parseInt(startRaw, 10);
  if (!Number.isInteger(start) || start < 0 || start >= fileSize) {
    return null;
  }

  let end;
  if (endRaw.length === 0) {
    end = fileSize - 1;
  } else {
    end = Number.parseInt(endRaw, 10);
    if (!Number.isInteger(end) || end < start) {
      return null;
    }
    end = Math.min(end, fileSize - 1);
  }

  return { start, end };
}
