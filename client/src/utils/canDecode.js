// Ported from the original Canbus.js decoding logic, unchanged so the
// numbers on screen match what the hardware / client.cpp protocol produced.

export const TEMP = [
  -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
];

export const VOLT = [
  2061, 2019, 1976, 1933, 1890, 1848, 1805, 1762, 1719, 1677, 1634, 1592,
  1551, 1509, 1469, 1428, 1388, 1349, 1310, 1272, 1235, 1198, 1162, 1127,
  1092, 1058, 1025, 993, 961, 931, 901, 872, 843, 816, 789, 763, 737, 713,
  689, 666, 643, 622, 601, 580, 561, 542, 523, 505, 488, 472, 456, 440, 425,
  410, 397, 383, 370, 358, 346, 334, 323, 312, 301, 291, 281, 272, 263, 254,
  246, 238, 230, 222, 215, 208, 201, 195, 188, 182, 176, 171, 165, 160, 155,
  150, 145, 141, 136, 132, 128, 124, 120,
];

export function convertTemp(readVolt) {
  for (let i = 0; i < VOLT.length; i++) {
    if (readVolt >= VOLT[i]) return TEMP[i];
  }
  return 23;
}

export function convertRawTempToCelsius(rawValue) {
  const voltage = (rawValue * 3.3) / 265595;
  return voltage;
}

export function getStatusCoreText(code) {
  switch (code) {
    case 0x00:
      return "OFF";
    case 0x01:
      return "Core Ready";
    case 0x02:
      return "Operation in Progress";
    case 0x03:
      return "Operation Halted";
    case 0x04:
      return "Operation Failed";
    default:
      return `Unknown (${code})`;
  }
}

const decodeLittleEndian = (lsb, msb) => msb * 256 + lsb;

// Parses a raw status line of the form "NO:xx LEN:n DATA:b0 b1 b2 ..."
export function parseStatusLine(raw) {
  if (!raw) return null;
  const matched = raw.match(/NO:(\w+)\s+LEN:\d+\s+DATA:([\da-fA-F\s]+)/);
  if (!matched) return null;

  const no = matched[1];
  const dataBytes = matched[2].trim().split(/\s+/).map((b) => parseInt(b, 16));

  switch (no.toUpperCase()) {
    case "21":
      return {
        vtm13: decodeLittleEndian(dataBytes[2], dataBytes[3]),
        vtm24: decodeLittleEndian(dataBytes[0], dataBytes[1]),
        vtm48: decodeLittleEndian(dataBytes[4], dataBytes[5]),
        current1: decodeLittleEndian(dataBytes[6], dataBytes[7]),
      };
    case "20":
      return {
        th1: decodeLittleEndian(dataBytes[0], dataBytes[1]),
        th2: decodeLittleEndian(dataBytes[2], dataBytes[3]),
        th3: decodeLittleEndian(dataBytes[4], dataBytes[5]),
        th4: decodeLittleEndian(dataBytes[6], dataBytes[7]),
      };
    case "1E": {
      const statusCoreCode = decodeLittleEndian(dataBytes[0], dataBytes[1]);
      return {
        statusCoreCode,
        statusCore: getStatusCoreText(statusCoreCode),
        temperature: decodeLittleEndian(dataBytes[2], dataBytes[3]),
      };
    }
    default:
      return null;
  }
}
