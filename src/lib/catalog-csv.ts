export interface CatalogEntry {
  numero: number;
  tema: string;
}

interface CsvRecord {
  cells: string[];
  line: number;
}

function detectDelimiter(text: string): string {
  let quoted = false;
  let commas = 0;
  let semicolons = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && text[index + 1] === '"' && quoted) {
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && (character === "\n" || character === "\r")) {
      break;
    } else if (!quoted && character === ",") {
      commas += 1;
    } else if (!quoted && character === ";") {
      semicolons += 1;
    }
  }

  return semicolons > commas ? ";" : ",";
}

function parseRecords(text: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  const finishCell = () => {
    cells.push(cell);
    cell = "";
  };
  const finishRecord = () => {
    finishCell();
    if (cells.some((value) => value.trim() !== "")) records.push({ cells, line: recordLine });
    cells = [];
    recordLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      if (!quoted && cell.length > 0) {
        throw new Error(`Formato CSV inválido na linha ${line}: aspas fora de um campo.`);
      }
      quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      finishCell();
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      finishRecord();
      line += 1;
    } else {
      cell += character;
      if (character === "\n") line += 1;
    }
  }

  if (quoted) throw new Error(`Formato CSV inválido na linha ${line}: aspas não fechadas.`);
  if (cell.length > 0 || cells.length > 0) finishRecord();
  return records;
}

function normalizarCabecalho(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function parseCatalogCsv(text: string): CatalogEntry[] {
  const conteudo = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(conteudo);
  const records = parseRecords(conteudo, delimiter);
  if (records.length < 2) {
    throw new Error("O CSV precisa ter o cabeçalho numero,tema e pelo menos uma linha de dados.");
  }

  const headers = records[0].cells.map(normalizarCabecalho);
  if (headers.length !== 2 || headers[0] !== "numero" || headers[1] !== "tema") {
    throw new Error("Use exatamente estas duas colunas, nesta ordem: numero,tema. Não inclua letras.");
  }

  const seen = new Set<number>();
  return records.slice(1).map(({ cells, line }) => {
    if (cells.length !== 2) {
      throw new Error(`A linha ${line} precisa ter exatamente as colunas numero e tema.`);
    }

    const rawNumber = cells[0].trim();
    if (!/^\d+$/.test(rawNumber)) {
      throw new Error(`Número inválido na linha ${line}: use somente um inteiro positivo.`);
    }
    const numero = Number(rawNumber);
    if (!Number.isSafeInteger(numero) || numero < 1) {
      throw new Error(`Número inválido na linha ${line}: use somente um inteiro positivo.`);
    }

    const tema = cells[1];
    if (tema.trim().length === 0) {
      throw new Error(`Tema vazio na linha ${line}.`);
    }
    if (seen.has(numero)) {
      throw new Error(`O número ${numero} aparece mais de uma vez no arquivo (linha ${line}).`);
    }
    seen.add(numero);
    return { numero, tema };
  });
}
