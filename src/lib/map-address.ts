const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
let ultimaConsultaNominatim = 0;

interface Coordenadas {
  latitude: number;
  longitude: number;
}

interface ResultadoNominatim {
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    residential?: string;
    path?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
  };
}

function coordenadasValidas(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function extrairCoordenadas(texto: string): Coordenadas | null {
  const coordenadas = texto.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!coordenadas) return null;

  const latitude = Number(coordenadas[1]);
  const longitude = Number(coordenadas[2]);
  return coordenadasValidas(latitude, longitude) ? { latitude, longitude } : null;
}

function hostGoogleMaps(url: URL): boolean {
  return url.protocol === "https:" && (
    url.hostname === "maps.app.goo.gl" ||
    url.hostname === "goo.gl" ||
    url.hostname === "maps.google.com" ||
    url.hostname === "google.com" ||
    url.hostname.endsWith(".google.com")
  );
}

export function enderecoLegivelDoLink(link: string): string | null {
  try {
    const url = new URL(link);
    if (!hostGoogleMaps(url)) return null;
    const busca =
      url.searchParams.get("query") ??
      url.searchParams.get("q") ??
      url.searchParams.get("destination");
    if (busca) return busca;

    const trecho = url.pathname.match(/\/maps\/(?:place|search|dir)\/([^/]+)/)?.[1];
    if (!trecho) return null;
    return decodeURIComponent(trecho.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

export function linkGoogleMapsDoEndereco(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.trim())}`;
}

function formatarEndereco(resultado: ResultadoNominatim): string {
  const endereco = resultado.address;
  if (!endereco) return resultado.display_name?.replace(/, Brasil$/, "") ?? "";

  const rua = endereco.road ?? endereco.pedestrian ?? endereco.residential ?? endereco.path;
  const bairro =
    endereco.neighbourhood ?? endereco.suburb ?? endereco.quarter ?? endereco.city_district;
  const cidade = endereco.city ?? endereco.town ?? endereco.village ?? endereco.municipality;
  const partes = [
    rua ? [rua, endereco.house_number].filter(Boolean).join(", ") : null,
    bairro,
    cidade,
    endereco.postcode ? `CEP ${endereco.postcode}` : null,
  ].filter((parte): parte is string => Boolean(parte));

  return partes.length > 0 ? partes.join(", ") : resultado.display_name?.replace(/, Brasil$/, "") ?? "";
}

export async function buscarEnderecoPorCoordenadas(
  coordenadas: Coordenadas,
  signal: AbortSignal,
): Promise<string> {
  const espera = Math.max(0, 1000 - (Date.now() - ultimaConsultaNominatim));
  if (espera > 0) await new Promise((resolve) => window.setTimeout(resolve, espera));
  if (signal.aborted) throw new DOMException("Consulta cancelada.", "AbortError");

  ultimaConsultaNominatim = Date.now();
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");
  url.searchParams.set("lat", String(coordenadas.latitude));
  url.searchParams.set("lon", String(coordenadas.longitude));

  const resposta = await fetch(url, { signal });
  if (!resposta.ok) {
    throw new Error(`O serviço de mapas respondeu com erro (${resposta.status}). Tente novamente.`);
  }

  const resultado = (await resposta.json()) as ResultadoNominatim;
  const endereco = formatarEndereco(resultado);
  if (!endereco) {
    throw new Error("Não foi possível localizar um endereço para esse ponto do mapa.");
  }
  return endereco;
}

export function coordenadasDoLinkMaps(link: string): Coordenadas | null {
  try {
    const url = new URL(link);
    if (!hostGoogleMaps(url)) return null;

    const mapa = url.href.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    const place = url.href.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
    const textoBusca =
      url.searchParams.get("query") ??
      url.searchParams.get("q") ??
      url.searchParams.get("destination") ??
      url.searchParams.get("center") ??
      url.searchParams.get("ll");
    if (mapa) {
      const latitude = Number(mapa[1]);
      const longitude = Number(mapa[2]);
      return coordenadasValidas(latitude, longitude) ? { latitude, longitude } : null;
    }

    if (place) {
      const latitude = Number(place[1]);
      const longitude = Number(place[2]);
      return coordenadasValidas(latitude, longitude) ? { latitude, longitude } : null;
    }

    return textoBusca ? extrairCoordenadas(textoBusca) : null;
  } catch {
    return null;
  }
}
