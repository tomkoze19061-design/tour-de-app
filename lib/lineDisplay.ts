// Pomocné funkce pro zobrazení linek ve frontendu.
// Tento soubor neimportuje databázi, takže ho lze použít
// i v klientských komponentách.

const TYPE_LABELS: Record<string, string> = {
  metro: "Metro",
  bus: "Autobus",
  tram: "Tramvaj",
  trolleybus: "Trolejbus",
  replacement: "Náhradní doprava",
  night: "Noční linka",
};

// Typ linky z API (např. "metro") převedeme na český popisek.
// Neznámý typ zobrazíme tak, jak přišel, jen s velkým počátečním písmenem.
export function lineTypeLabel(type: string): string {
  const known = TYPE_LABELS[type.toLowerCase()];
  if (known) return known;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Vybere barvu textu (tmavou nebo bílou), která bude čitelná
// na barvě linky -- např. na žluté lince musí být tmavé písmo.
// Používá relativní jas podle WCAG.
export function readableTextColor(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#1A1A1A";

  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }
  );
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  // Kontrast vůči bílé vs. vůči brand černé (#1A1A1A, jas ~0.010)
  const contrastWhite = 1.05 / (luminance + 0.05);
  const contrastDark = (luminance + 0.05) / 0.06;

  return contrastDark >= contrastWhite ? "#1A1A1A" : "#FFFFFF";
}
