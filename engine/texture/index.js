// texture — 物理材质层（P10）：medium → CSS 类映射 + 材质样式（纸纹/复印/孔版/网点/胶片/报纸/杂志）
export const MEDIUM_CLASS = {
  photocopied: 'xerox', xerox: 'xerox', offset: 'paper', letterpress: 'paper',
  screen_print: 'screen_print', risograph: 'risograph', newspaper: 'newspaper',
  magazine: 'magazine', film: 'film', mixed_media: 'paper', printed: 'paper', digital: 'paper',
};

/** 返回 .materiality-* 的 CSS（给 renderer 注入） */
export function materialityCss() {
  return [
    `.materiality { z-index: 2; pointer-events: none; mix-blend-mode: multiply; opacity: .55; }`,
    `.materiality-paper { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E"); opacity: calc(.18 + .5 * var(--grain, .5)); }`,
    `.materiality-xerox { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); filter: contrast(1.4); opacity: calc(.3 + .5 * var(--grain, .5)); }`,
    `.materiality-risograph { background: linear-gradient(135deg, rgba(255,0,64,.10), rgba(0,80,255,.10)); opacity: calc(.3 + .4 * var(--imp, .5)); }`,
    `.materiality-risograph::after { content:''; position:absolute; inset:0; background-image: radial-gradient(rgba(0,0,0,.35) 0.5px, transparent 1px); background-size: 5px 5px; opacity: .3; }`,
    `.materiality-screen_print { background-image: radial-gradient(rgba(0,0,0,.25) 0.6px, transparent 1.2px); background-size: 7px 7px; opacity: calc(.25 + .4 * var(--imp, .5)); }`,
    `.materiality-film { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); box-shadow: inset 0 0 12cqw rgba(0,0,0,.55); }`,
    `.materiality-newspaper { background-image: radial-gradient(rgba(0,0,0,.28) 0.4px, transparent 0.8px); background-size: 4px 4px; opacity: .3; }`,
    `.materiality-magazine { background: linear-gradient(115deg, rgba(255,255,255,.10), transparent 40%); opacity: .4; }`,
  ].join('\n');
}

export default { MEDIUM_CLASS, materialityCss };
