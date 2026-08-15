/**
 * weather-codes — WMO 天气码 → 分组 / 文案
 *
 * 分组（group）：clear / cloud / fog / drizzle / rain / snow / storm
 * 用于把实时天气映射到海报相位（style.weather.phases 的 match.group）。
 */
export const WMO_CODES = {
  0:  { group: 'clear', emoji: 'sunny',   label: 'CLEAR' },
  1:  { group: 'clear', emoji: 'sunny',   label: 'MOSTLY CLEAR' },
  2:  { group: 'cloud', emoji: 'cloud',   label: 'PARTLY CLOUDY' },
  3:  { group: 'cloud', emoji: 'cloud',   label: 'CLOUDY' },
  45: { group: 'fog',   emoji: 'fog',     label: 'FOG' },
  48: { group: 'fog',   emoji: 'fog',     label: 'ICY FOG' },
  51: { group: 'drizzle', emoji: 'rain',  label: 'LIGHT DRIZZLE' },
  53: { group: 'drizzle', emoji: 'rain',  label: 'DRIZZLE' },
  55: { group: 'drizzle', emoji: 'rain',  label: 'DENSE DRIZZLE' },
  56: { group: 'drizzle', emoji: 'rain',  label: 'FREEZING DRIZZLE' },
  57: { group: 'drizzle', emoji: 'rain',  label: 'FREEZING DRIZZLE' },
  61: { group: 'rain',   emoji: 'rain',   label: 'LIGHT RAIN' },
  63: { group: 'rain',   emoji: 'rain',   label: 'RAIN' },
  65: { group: 'rain',   emoji: 'rain',   label: 'HEAVY RAIN' },
  66: { group: 'rain',   emoji: 'rain',   label: 'FREEZING RAIN' },
  67: { group: 'rain',   emoji: 'rain',   label: 'FREEZING RAIN' },
  71: { group: 'snow',   emoji: 'snow',   label: 'LIGHT SNOW' },
  73: { group: 'snow',   emoji: 'snow',   label: 'SNOW' },
  75: { group: 'snow',   emoji: 'snow',   label: 'HEAVY SNOW' },
  77: { group: 'snow',   emoji: 'snow',   label: 'SNOW GRAINS' },
  80: { group: 'rain',   emoji: 'shower', label: 'RAIN SHOWERS' },
  81: { group: 'rain',   emoji: 'shower', label: 'RAIN SHOWERS' },
  82: { group: 'rain',   emoji: 'shower', label: 'VIOLENT SHOWERS' },
  85: { group: 'snow',   emoji: 'snow',   label: 'SNOW SHOWERS' },
  86: { group: 'snow',   emoji: 'snow',   label: 'SNOW SHOWERS' },
  95: { group: 'storm',  emoji: 'storm',  label: 'THUNDERSTORM' },
  96: { group: 'storm',  emoji: 'storm',  label: 'THUNDERSTORM + HAIL' },
  99: { group: 'storm',  emoji: 'storm',  label: 'SEVERE STORM' },
};

export function groupForCode(code) {
  return (WMO_CODES[code] && WMO_CODES[code].group) || 'cloud';
}
export function labelForCode(code) {
  return (WMO_CODES[code] && WMO_CODES[code].label) || 'CLOUDY';
}

/** 在 phases 里找第一个 match 满足 (group, isDay) 的相位，默认 0 */
export function matchPhase(phases, group, isDay) {
  if (!Array.isArray(phases) || !phases.length) return 0;
  for (let i = 0; i < phases.length; i++) {
    const m = phases[i]?.match ?? {};
    const g = m.group ? (Array.isArray(m.group) ? m.group.includes(group) : m.group === group) : true;
    const d = m.isDay !== undefined ? m.isDay === isDay : true;
    if (g && d) return i;
  }
  return 0;
}
