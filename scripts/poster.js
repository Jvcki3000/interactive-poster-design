#!/usr/bin/env node
/**
 * poster — poster-design skill 统一入口（自动定位 poster-engine）
 *
 * 用法:
 *   node scripts/poster.js render <spec.json> [--out dir] [--preset name] [--palette p.json] [--critic]
 *   node scripts/poster.js iterate <spec.json> [--max n] [--out dir] [--preset name]
 *   node scripts/poster.js palette <image> [--colors n] [--out p.json]
 *   node scripts/poster.js serve [dir] [port]
 *
 * 引擎定位顺序: $POSTER_ENGINE_DIR → <skill>/poster-engine（内置）→ <skill>/../poster-engine（相邻）→ 兜底
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');


/** 把参数里的相对路径转成绝对路径（基于调用者 cwd），保证 engine cwd 下也能正确解析 */
function absolutizePaths(command, args) {
  const isAbs = (p) => /^[a-zA-Z]:[\\/]|^\\|^\//.test(p);
  const abs = (p) => (p && !isAbs(p) ? resolve(p) : p);
  const out = args.slice();
  const set = (i, v) => { if (i >= 0 && out[i + 1]) out[i + 1] = abs(out[i + 1]); };
  if (command === 'palette') {
    const img = out.findIndex((a) => a && !a.startsWith('--'));
    if (img >= 0) out[img] = abs(out[img]);
    set(out.indexOf('--out'), null);
  } else if (command === 'vocab') {
    const vi = out.findIndex((a) => a === 'validate');
    if (vi >= 0 && out[vi + 1]) out[vi + 1] = abs(out[vi + 1]);
    set(out.indexOf('--out'), null);
  } else if (command === 'brief') {
    set(out.indexOf('--out'), null);
    set(out.indexOf('--image'), null);
  } else if (command === 'dna-presets') {
    set(out.indexOf('--out'), null);
  } else if (command === 'dna') {
    if (out[0] === 'to-spec') { if (out[1]) out[1] = abs(out[1]); }
    else { const f = out.findIndex((a) => a && !a.startsWith('--')); if (f >= 0) out[f] = abs(out[f]); }
    set(out.indexOf('--out'), null);
  } else if (command === 'explore') {
    set(out.indexOf('--out'), null);
    set(out.indexOf('--image'), null);
  } else if (command === 'director') {
    set(out.indexOf('--out'), null);
    set(out.indexOf('--image'), null);
  } else if (command === 'materials') {
    for (let i = 0; i < out.length; i++) { const a = out[i]; if (a && !a.startsWith('--') && !/^-/.test(a) && !a.endsWith('.json')) out[i] = abs(a); }
    set(out.indexOf('--out'), null);
  } else if (command === 'refine') {
    const f = out.findIndex((a) => a && a.endsWith('.json')); if (f >= 0) out[f] = abs(out[f]);
    set(out.indexOf('--out'), null);
  } else if (command === 'evolve') {
    const f = out.findIndex((a) => a && a.endsWith('.json')); if (f >= 0) out[f] = abs(out[f]);
    set(out.indexOf('--out'), null);
  } else if (command === 'surprise' || command === 'lab') {
    set(out.indexOf('--out'), null);
  } else if (command === 'bench') {
    set(out.indexOf('--out'), null);
  } else if (command === 'weather') {
    set(out.indexOf('--spec'), null);
  } else if (command === 'protagonist') {
    if (!out.includes('--generate')) {
      const photo = out.findIndex((a) => a && !a.startsWith('--'));
      if (photo >= 0) out[photo] = abs(out[photo]);
    }
    set(out.indexOf('--out'), null);
    set(out.indexOf('--labels'), null);
  } else if (command === 'imagegen') {
    set(out.indexOf('--out'), null);
  } else if (command === 'group') {
    const photo = out.findIndex((a) => a && !a.startsWith('--'));
    if (photo >= 0) out[photo] = abs(out[photo]);
    set(out.indexOf('--out'), null);
  } else if (command === 'serve') {
    const d = out.findIndex((a) => a && !a.startsWith('--') && !/^\d+$/.test(a));
    if (d >= 0) out[d] = abs(out[d]);
  } else {
    const spec = out.findIndex((a) => a && !a.startsWith('--'));
    if (spec >= 0) out[spec] = abs(out[spec]);
    set(out.indexOf('--out'), null);
    set(out.indexOf('--palette'), null);
    set(out.indexOf('--fingerprint'), null);
  }
  return out;
}


function findEngine() {
  const candidates = [
    process.env.POSTER_ENGINE_DIR,
    skillRoot,                                             // 新布局：引擎即 skill 根（engine/ renderer/ scripts/）
    join(skillRoot, 'poster-engine'),                     // 内置（skill 自包含，推荐）
    join(skillRoot, '..', 'poster-engine'),                // 相邻（旧布局兼容）
    'C:/Users/foshanwuyanzu/Desktop/poster/poster-design/poster-engine', // 兜底（本机）
  ].filter(Boolean).map((p) => resolve(p));
  for (const c of candidates) {
    if (existsSync(join(c, 'scripts', 'render.js'))) return c;
  }
  return null;
}

function findPython() {
  const candidates = [
    process.env.POSTER_ENGINE_PYTHON,
    'python',
    'py',
    'C:/Users/foshanwuyanzu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  ].filter(Boolean);
  return candidates[0];
}

const usage = () => {
  console.error(`用法: node scripts/poster.js <render|iterate|directions|brief|analyze|palette|vocab|plan|weather|protagonist|imagegen|group|serve> [参数...]
  render      <spec.json> [--out dir] [--preset 风格] [--palette p.json] [--critic]
  iterate     <spec.json> [--max n] [--out dir] [--preset 风格]
  directions  <spec.json> [--seed N] [--out dir] [--render] [--pick N]
  brief       [--style x --color y --interaction z --title t ...]  # 需求引导/生成 spec
  palette     <image> [--colors n] [--out p.json]
  analyze     <image> [--colors n] [--out fingerprint.json]  # 参考海报设计指纹
  vocab       list | compose --layout x --type y --color z --fx ... | validate <spec>
  plan        <spec.json> [--fingerprint fp.json] [--out plan.md]  # 9 维度设计方案
  weather     <city> | --lat x --lon y [--spec weather-spec.json]  # 实时天气 → 相位
  protagonist <照片|--generate 描述> [--title 片名] [--multi] [--out dir] [--critic]  # 一键主角电影海报
  imagegen     <prompt> [--out png] [--size WxH]  # 生图（需 image_gen 工具或 OPENAI_API_KEY）
  group        <照片> [--out dir]  # 多人圈选命名页 → labels.json
  export      <spec.json> --out poster.png [--width 1200]  # 渲染 + 无头 Chrome 导出 PNG（零依赖）
  detect      <图片> [--out coords.json]  # mediapipe 五官坐标（代码合成 overlay 定位）
  dna         <dna.json> | --template      # Design DNA 校验 + 兼容规则 + 反 AI 风险
  dna-presets [list|show <key>|pick <q>|mutate <key> --color x ...]  # Design DNA 预设库（36 种起点 → 按需变异）
  explore     "<brief>" [--moods RAW,LOUD] [--seed N] [--out dir] [--render]  # 首次 UX：Mood + 3 个方向（概念名）
  refine      <dna.json> "<反馈>" [--out dna.json] [--render]      # 首次 UX：自然语言反馈 → 定向 DNA 变异
  evolve      <dna.json> "<反馈/方向>" [--out workspace] [--seed N] [--render]  # Phase D：演化 + 版本历史（可回退）
  surprise    [--seed N] [--render] [--out dir]                     # Phase E：给我惊喜（随机主题 → 3 方向）
  lab         "<brief>" [--preset key] [--moods X] [--show-dna]    # Phase E：Advanced Design Lab（高级）
  materials   <图片...> [--out board.json] [--role hero]            # 素材智能：上传板 + 分析 + 角色 + 处理建议
  bench       [--seed N] [--limit M] [--out dir]                    # 基准：24 briefs → 多样性/质量报告（Diversity ≥0.70）
  serve       [dir] [port]`);
};

const command = process.argv[2];
const rest = absolutizePaths(command, process.argv.slice(3));
const engine = findEngine();

if (!engine) {
  console.error('找不到引擎（scripts/render.js）。请设置环境变量 POSTER_ENGINE_DIR 指向 skill 根。');
  process.exit(1);
}

if (command === 'palette' || command === 'analyze' || command === 'detect') {
  const py = findPython();
  const script = command === 'palette' ? 'palette.py' : command === 'analyze' ? 'analyze_poster.py' : 'detect.py';
  const res = spawnSync(py, [join(engine, 'scripts', script), ...rest], { stdio: 'inherit', cwd: engine });
  process.exit(res.status ?? 1);
}

let target = null;
if (command === 'render') target = join(engine, 'scripts', 'render.js');
else if (command === 'iterate') target = join(engine, 'scripts', 'iterate.js');
else if (command === 'directions') target = join(engine, 'scripts', 'directions.js');
else if (command === 'brief') target = join(engine, 'scripts', 'brief.js');
else if (command === 'vocab') target = join(engine, 'scripts', 'vocab.js');
else if (command === 'plan') target = join(engine, 'scripts', 'plan.js');
else if (command === 'serve') target = join(engine, 'scripts', 'serve.js');
else if (command === 'weather') target = join(engine, 'scripts', 'weather.js');
else if (command === 'protagonist') target = join(engine, 'scripts', 'protagonist.js');
else if (command === 'imagegen') target = join(engine, 'scripts', 'imagegen.js');
else if (command === 'group') target = join(engine, 'scripts', 'group.js');
else if (command === 'export') target = join(engine, 'scripts', 'export.js');
else if (command === 'dna') target = join(engine, 'scripts', 'dna.js');
else if (command === 'dna-presets') target = join(engine, 'scripts', 'dna-presets.js');
else if (command === 'director') target = join(engine, 'scripts', 'director.js');
else if (command === 'bench') target = join(engine, 'scripts', 'bench.js');
else if (command === 'explore') target = join(engine, 'scripts', 'explore.js');
else if (command === 'refine') target = join(engine, 'scripts', 'refine.js');
else if (command === 'evolve') target = join(engine, 'scripts', 'evolve.js');
else if (command === 'surprise') target = join(engine, 'scripts', 'surprise.js');
else if (command === 'lab') target = join(engine, 'scripts', 'lab.js');
else if (command === 'materials') target = join(engine, 'scripts', 'materials.js');
else {
  usage();
  process.exit(1);
}

const res = spawnSync(process.execPath, [target, ...rest], { stdio: 'inherit', cwd: engine });
process.exit(res.status ?? 1);