import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferRole, treatmentsFor, materialsToSpec, materialDelta } from '../../engine/materials/index.js';
import { validateDna } from '../../engine/design-dna/dna.js';

test('素材：角色推断（人物→hero / 低复杂→texture / logo）', () => {
  assert.equal(inferRole({ human_presence: true, face_presence: true }), 'hero');
  assert.equal(inferRole({ logo_presence: true }), 'logo');
  assert.equal(inferRole({ background_complexity: 0.2, texture: 0.7 }), 'texture');
  assert.equal(inferRole({ background_complexity: 0.2, texture: 0.1 }), 'background');
});

test('素材：处理建议非空 + 角色映射', () => {
  assert.ok(treatmentsFor('hero').includes('duotone'));
  assert.ok(treatmentsFor('texture').includes('photocopy'));
});

test('素材：materialsToSpec → 主图 + Logo + 处理', () => {
  const spec = materialsToSpec([
    { id: 'm1', role: 'hero', treatment: 'duotone', source_url: 'a.jpg', hierarchy: 0.85 },
    { id: 'm2', role: 'logo', treatment: 'original', source_url: 'logo.png' },
  ]);
  assert.equal(spec.imagery.image.src, 'a.jpg');
  assert.equal(spec.imagery.image.duotone, true);
  assert.equal(spec.imagery.logo, 'logo.png');
});

test('素材：自然语言素材指令', () => {
  assert.equal(materialDelta('把它做成双色调').delta.treatment, 'duotone');
  assert.equal(materialDelta('把这个当Logo用').delta.role, 'logo');
  assert.equal(materialDelta('素材放大突出').delta.hierarchy, 0.2);
});

test('素材 CLI：materials → 分析 + 角色 + 处理建议', () => {
  const script = fileURLToPath(new URL('../../scripts/materials.js', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'mat-test-'));
  const out = join(dir, 'board.json');
  const img = fileURLToPath(new URL('../../assets/reference/protagonist.jpg', import.meta.url));
  execFileSync(process.execPath, [script, img, '--out', out], { stdio: 'pipe' });
  const board = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(board.length, 1);
  assert.ok(board[0].role && board[0].treatments.length > 0);
});

test('素材：explore --image → 每方向都有素材且 DNA 合法', () => {
  const script = fileURLToPath(new URL('../../scripts/explore.js', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'mat-explore-'));
  const img = fileURLToPath(new URL('../../assets/reference/protagonist.jpg', import.meta.url));
  execFileSync(process.execPath, [script, 'fashion campaign', '--image', img, '--seed', '9', '--out', dir], { stdio: 'pipe' });
  for (let i = 0; i < 3; i++) {
    const dna = JSON.parse(readFileSync(join(dir, 'd' + i, 'dna.json'), 'utf8'));
    assert.equal(validateDna(dna).ok, true, 'd' + i);
    assert.ok(Array.isArray(dna.design_vocabulary.materials) && dna.design_vocabulary.materials.length === 1, 'd' + i + ' 应有素材');
    const spec = JSON.parse(readFileSync(join(dir, 'd' + i, 'spec.json'), 'utf8'));
    assert.ok(spec.style.imagery && spec.style.imagery.image, 'd' + i + ' spec 应含素材图');
  }
});
