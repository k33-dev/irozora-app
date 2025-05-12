import React, { useState } from 'react';

const MODEL_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
const HF_API_TOKEN = process.env.REACT_APP_HF_API_TOKEN;

// 各質問の選択肢と色成分（RGB）
const questions = [
  {
    label: '今の気分は？',
    key: 'emotion',
    options: [
      { label: '嬉しい', color: [255, 215, 0] },      // ゴールド
      { label: '悲しい', color: [30, 144, 255] },     // 青
      { label: '怒り', color: [255, 69, 0] },         // オレンジレッド
      { label: 'ワクワク', color: [255, 105, 180] },  // ピンク
      { label: '落ち着く', color: [34, 139, 34] },    // 緑
      { label: '不安', color: [138, 43, 226] },       // 紫
      { label: '安心', color: [135, 206, 250] },      // ライトブルー
      { label: '焦り', color: [255, 140, 0] },        // ダークオレンジ
      { label: '孤独', color: [112, 128, 144] },      // スレートグレー
    ],
  },
  {
    label: 'エネルギーの高さは？',
    key: 'energy',
    options: [
      { label: '高い', color: [255, 0, 0] },    // 赤
      { label: '普通', color: [255, 255, 255] },// 白（影響小）
      { label: '低い', color: [0, 0, 255] },    // 青
    ],
  },
  {
    label: '今日の天気は？',
    key: 'weather',
    options: [
      { label: '晴れ', color: [255, 255, 0] },   // 黄色
      { label: '曇り', color: [169, 169, 169] }, // グレー
      { label: '雨', color: [70, 130, 180] },    // スチールブルー
      { label: '雪', color: [240, 248, 255] },   // アリスブルー
    ],
  },
  {
    label: '体調は？',
    key: 'condition',
    options: [
      { label: '良い', color: [144, 238, 144] },   // ライトグリーン
      { label: '普通', color: [255, 255, 255] },   // 白
      { label: '悪い', color: [220, 20, 60] },     // クリムゾン
    ],
  },
];

// 色彩心理学に基づく色の割り当てルール例
const colorPsychology: Record<string, Record<string, number[]>> = {
  emotion: {
    '嬉しい': [255, 223, 0],      // 明るい黄色
    '悲しい': [70, 130, 180],     // スチールブルー
    '怒り': [220, 20, 60],        // クリムゾン
    'ワクワク': [255, 105, 180],  // ピンク
    '落ち着く': [60, 179, 113],   // ミディアムシーグリーン
    '不安': [138, 43, 226],       // ブルーバイオレット
    '安心': [135, 206, 250],      // ライトスカイブルー
    '焦り': [255, 140, 0],        // ダークオレンジ
    '孤独': [112, 128, 144],      // スレートグレー
  },
  energy: {
    '高い': [255, 69, 0],         // オレンジレッド
    '普通': [255, 255, 255],      // 白
    '低い': [100, 149, 237],      // コーンフラワーブルー
  },
  weather: {
    '晴れ': [255, 215, 0],        // ゴールド
    '曇り': [169, 169, 169],      // ダークグレー
    '雨': [70, 130, 180],         // スチールブルー
    '雪': [240, 248, 255],        // アリスブルー
  },
  condition: {
    '良い': [144, 238, 144],      // ライトグリーン
    '普通': [255, 255, 255],      // 白
    '悪い': [128, 128, 128],      // グレー
  },
};

// 質問ごとの重み付け
const weights: Record<string, number> = {
  emotion: 2.0,
  energy: 1.5,
  weather: 1.0,
  condition: 1.5,
};

// キーワードごとの色（自由記述用）
const keywordColors: Record<string, number[]> = {
  '海': [30, 144, 255],    // 青
  '花': [255, 105, 180],   // ピンク
  '森': [34, 139, 34],     // 緑
  '太陽': [255, 215, 0],   // ゴールド
  '夜': [25, 25, 112],     // ミッドナイトブルー
  '空': [135, 206, 235],   // スカイブルー
  '火': [255, 69, 0],      // オレンジレッド
  '雪': [240, 248, 255],   // アリスブルー
  '夢': [186, 85, 211],    // 紫
  '音楽': [255, 160, 122], // ライトサーモン
};

function rgbToHex([r, g, b]: number[]): string {
  return (
    '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  );
}

const getRandomColor = () => {
  // 0x000000～0xFFFFFFの範囲でランダムな整数を生成し、16進数6桁に変換
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
};

function getKeywordColor(text: string): number[] | null {
  for (const key in keywordColors) {
    if (text.includes(key)) return keywordColors[key];
  }
  return null;
}

// 補色を計算
function getComplementaryColor(hex: string): string {
  if (!hex.startsWith('#') || hex.length !== 7) return '#cccccc';
  const r = 255 - parseInt(hex.slice(1, 3), 16);
  const g = 255 - parseInt(hex.slice(3, 5), 16);
  const b = 255 - parseInt(hex.slice(5, 7), 16);
  return rgbToHex([r, g, b]);
}

// 補色・トライアド・アナログ配色からランダムで1つを返す
function getPairColor(hex: string): string {
  if (!hex.startsWith('#') || hex.length !== 7) return '#cccccc';
  // HEX→HSL
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  h = h * 360;
  // 補色・トライアド・アナログ
  const types = [180, 120, 30];
  const deg = types[Math.floor(Math.random() * types.length)];
  let newH = (h + deg) % 360;
  // HSL→RGB
  s = Math.max(0.2, s); // 彩度を最低限確保
  l = Math.max(0.35, Math.min(0.65, l)); // 明度も調整
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((newH / 60) % 2 - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= newH && newH < 60) [r1, g1, b1] = [c, x, 0];
  else if (60 <= newH && newH < 120) [r1, g1, b1] = [x, c, 0];
  else if (120 <= newH && newH < 180) [r1, g1, b1] = [0, c, x];
  else if (180 <= newH && newH < 240) [r1, g1, b1] = [0, x, c];
  else if (240 <= newH && newH < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const to255 = (v: number) => Math.round((v + m) * 255);
  return rgbToHex([to255(r1), to255(g1), to255(b1)]);
}

// 100個程度の質問データ例（実際は一部のみ記載、必要に応じて拡充）
const allQuestions = [
  // 感情・気分に関する質問
  { label: '今の気分は？', key: 'emotion1', options: ['嬉しい', '悲しい', '怒り', 'ワクワク', '落ち着く', '不安', '安心', '焦り', '孤独'] },
  { label: '今の心の状態は？', key: 'emotion2', options: ['穏やか', '興奮', '疲れ', '希望', '絶望', '期待', '後悔', '感謝', '憧れ'] },
  { label: '今の感情の強さは？', key: 'emotion3', options: ['とても強い', 'やや強い', '普通', 'やや弱い', 'とても弱い'] },
  
  // エネルギー・活力に関する質問
  { label: 'エネルギーの高さは？', key: 'energy1', options: ['高い', '普通', '低い'] },
  { label: '今日の活力レベルは？', key: 'energy2', options: ['満タン', 'やや高い', '普通', 'やや低い', '空っぽ'] },
  { label: '今の集中力は？', key: 'energy3', options: ['とても高い', 'やや高い', '普通', 'やや低い', 'とても低い'] },
  
  // 天気・環境に関する質問
  { label: '今日の天気は？', key: 'weather1', options: ['晴れ', '曇り', '雨', '雪'] },
  { label: '今の空の様子は？', key: 'weather2', options: ['青空', '薄曇り', '雨雲', '夕焼け', '星空', '朝焼け', '虹', '雷雲'] },
  { label: '今の気温は？', key: 'weather3', options: ['暑い', 'やや暑い', '快適', 'やや寒い', '寒い'] },
  
  // 体調に関する質問
  { label: '体調は？', key: 'condition1', options: ['良い', '普通', '悪い'] },
  { label: '今の疲労度は？', key: 'condition2', options: ['全くない', '少しある', '普通', 'やや強い', 'とても強い'] },
  { label: '睡眠の質は？', key: 'condition3', options: ['とても良い', 'やや良い', '普通', 'やや悪い', 'とても悪い'] },
  
  // 季節感に関する質問
  { label: '好きな季節は？', key: 'season1', options: ['春', '夏', '秋', '冬'] },
  { label: '今の季節感は？', key: 'season2', options: ['春めいている', '夏らしい', '秋を感じる', '冬の雰囲気', '季節感がない'] },
  { label: '今の季節の色は？', key: 'season3', options: ['桜色', '新緑', '夏空', '紅葉', '雪景色'] },
  
  // 欲求・願望に関する質問
  { label: '今一番欲しいものは？', key: 'want1', options: ['お金', '愛', '自由', '知識', '健康', '時間', '友達', '冒険', '癒し'] },
  { label: '今の目標は？', key: 'want2', options: ['成功', '成長', '安定', '変化', '挑戦', '休息', '発見', '創造', '貢献'] },
  { label: '今の願いは？', key: 'want3', options: ['幸せ', '平和', '繁栄', '健康', '愛', '自由', '成長', '発展', '調和'] },
  
  // 音楽・音に関する質問
  { label: '最近よく聴く音楽ジャンルは？', key: 'music1', options: ['ポップ', 'ロック', 'クラシック', 'ジャズ', 'ヒップホップ', 'EDM', 'アニソン', '演歌', 'その他'] },
  { label: '今の気分に合う音楽は？', key: 'music2', options: ['明るい曲', '静かな曲', '激しい曲', '優しい曲', '元気な曲', '切ない曲', '癒し系', 'ダンス系'] },
  { label: '今の心の音は？', key: 'music3', options: ['高音', '中音', '低音', '和音', '不協和音', '静寂', 'リズム', 'メロディ'] },
  
  // 自然・環境に関する質問
  { label: '好きな自然の風景は？', key: 'nature1', options: ['海', '山', '森', '草原', '砂漠', '雪原', '滝', '湖', '星空'] },
  { label: '今の自然の色は？', key: 'nature2', options: ['青', '緑', '茶', '白', '赤', '黄', '紫', 'オレンジ', 'ピンク'] },
  { label: '今の自然の音は？', key: 'nature3', options: ['波の音', '風の音', '雨の音', '鳥の声', '虫の声', '木の葉の音', '川の流れ', '雷鳴'] },
  
  // 時間感覚に関する質問
  { label: '今の時間の流れは？', key: 'time1', options: ['早い', '普通', '遅い'] },
  { label: '今の時間帯は？', key: 'time2', options: ['朝', '昼', '夕方', '夜', '深夜'] },
  { label: '今の時間の質は？', key: 'time3', options: ['充実', '退屈', '忙しい', 'のんびり', '緊張', 'リラックス'] },
  
  // 空間感覚に関する質問
  { label: '今の空間の広さは？', key: 'space1', options: ['広い', '普通', '狭い'] },
  { label: '今の空間の明るさは？', key: 'space2', options: ['明るい', 'やや明るい', '普通', 'やや暗い', '暗い'] },
  { label: '今の空間の温度は？', key: 'space3', options: ['暖かい', 'やや暖かい', '普通', 'やや涼しい', '涼しい'] },
  
  // 人間関係に関する質問
  { label: '今の人間関係は？', key: 'relation1', options: ['良好', '普通', '悪い'] },
  { label: '今の対人関係の距離感は？', key: 'relation2', options: ['近い', 'やや近い', '普通', 'やや遠い', '遠い'] },
  { label: '今のコミュニケーションは？', key: 'relation3', options: ['活発', '普通', '控えめ', '難しい', '楽しい'] },
  
  // 思考・創造性に関する質問
  { label: '今の思考の状態は？', key: 'think1', options: ['明晰', '混乱', '創造的', '論理的', '直感的', '発散的', '収束的'] },
  { label: '今の創造性は？', key: 'think2', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  { label: '今のアイデアの質は？', key: 'think3', options: ['革新的', '実用的', '芸術的', '論理的', '直感的', '複雑', 'シンプル'] },
  
  // 感覚に関する質問
  { label: '今の視覚的印象は？', key: 'sense1', options: ['鮮明', 'ぼやけている', 'カラフル', 'モノクロ', '明るい', '暗い'] },
  { label: '今の触覚的印象は？', key: 'sense2', options: ['柔らかい', '硬い', '温かい', '冷たい', '滑らか', '粗い'] },
  { label: '今の嗅覚的印象は？', key: 'sense3', options: ['甘い', '苦い', '酸っぱい', '香ばしい', '爽やか', '重い'] },
  
  // 行動・活動に関する質問
  { label: '今の活動レベルは？', key: 'action1', options: ['活発', 'やや活発', '普通', 'やや控えめ', '控えめ'] },
  { label: '今の行動の質は？', key: 'action2', options: ['効率的', '創造的', '慎重', '大胆', '柔軟', '計画的な'] },
  { label: '今の運動量は？', key: 'action3', options: ['多い', 'やや多い', '普通', 'やや少ない', '少ない'] },
  
  // 未来・希望に関する質問
  { label: '今の未来への希望は？', key: 'future1', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  { label: '今の目標への意欲は？', key: 'future2', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  { label: '今の変化への期待は？', key: 'future3', options: ['大きい', 'やや大きい', '普通', 'やや小さい', '小さい'] },
  
  // 過去・記憶に関する質問
  { label: '今の過去の印象は？', key: 'past1', options: ['良い', 'やや良い', '普通', 'やや悪い', '悪い'] },
  { label: '今の思い出の質は？', key: 'past2', options: ['楽しい', '悲しい', '懐かしい', '後悔', '感謝', '学び'] },
  { label: '今の経験の価値は？', key: 'past3', options: ['貴重', '普通', '無駄', '学び', '成長', '教訓'] },
  
  // 現在・今この瞬間に関する質問
  { label: '今この瞬間の充実度は？', key: 'present1', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  { label: '今この瞬間の意識は？', key: 'present2', options: ['集中', '散漫', 'リラックス', '緊張', '瞑想', '活動的'] },
  { label: '今この瞬間の質は？', key: 'present3', options: ['充実', '退屈', '緊張', 'リラックス', '創造的', '実用的'] },
  
  // 夢・理想に関する質問
  { label: '今の夢の大きさは？', key: 'dream1', options: ['大きい', 'やや大きい', '普通', 'やや小さい', '小さい'] },
  { label: '今の理想の実現度は？', key: 'dream2', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  { label: '今の願望の強さは？', key: 'dream3', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  
  // 現実・実用に関する質問
  { label: '今の現実感は？', key: 'reality1', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  { label: '今の実用性は？', key: 'reality2', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  { label: '今の効率性は？', key: 'reality3', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  
  // バランス・調和に関する質問
  { label: '今の心身のバランスは？', key: 'balance1', options: ['良い', 'やや良い', '普通', 'やや悪い', '悪い'] },
  { label: '今の生活の調和は？', key: 'balance2', options: ['取れている', 'やや取れている', '普通', 'やや取れていない', '取れていない'] },
  { label: '今の環境との調和は？', key: 'balance3', options: ['良い', 'やや良い', '普通', 'やや悪い', '悪い'] },
  
  // 変化・成長に関する質問
  { label: '今の変化の度合いは？', key: 'change1', options: ['大きい', 'やや大きい', '普通', 'やや小さい', '小さい'] },
  { label: '今の成長の度合いは？', key: 'change2', options: ['大きい', 'やや大きい', '普通', 'やや小さい', '小さい'] },
  { label: '今の進化の度合いは？', key: 'change3', options: ['大きい', 'やや大きい', '普通', 'やや小さい', '小さい'] },
  
  // 安定・安心に関する質問
  { label: '今の安定感は？', key: 'stable1', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  { label: '今の安心感は？', key: 'stable2', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  { label: '今の安全度は？', key: 'stable3', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  
  // 刺激・冒険に関する質問
  { label: '今の刺激の度合いは？', key: 'adventure1', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  { label: '今の冒険心は？', key: 'adventure2', options: ['強い', 'やや強い', '普通', 'やや弱い', '弱い'] },
  { label: '今の挑戦意欲は？', key: 'adventure3', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  
  // 休息・回復に関する質問
  { label: '今の休息の質は？', key: 'rest1', options: ['良い', 'やや良い', '普通', 'やや悪い', '悪い'] },
  { label: '今の回復度は？', key: 'rest2', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  { label: '今のリラックス度は？', key: 'rest3', options: ['高い', 'やや高い', '普通', 'やや低い', '低い'] },
  
  // 最後の質問
  { label: '今のあなたを色で例えると？', key: 'final', options: ['赤', '青', '黄', '緑', '紫', 'ピンク', 'オレンジ', '白', '黒'] }
];

// 100問に満たない場合はダミーで埋める
while (allQuestions.length < 100) {
  allQuestions.push({
    label: '今の気分を色で例えると？',
    key: `dummy${allQuestions.length + 1}`,
    options: ['赤', '青', '黄', '緑', '紫', 'ピンク', 'オレンジ', '白', '黒']
  });
}

function getRandomQuestions(n: number) {
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// HEX→HSL変換関数
function hexToHsl(hex: string): { h: number, s: number, l: number } {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

// HSL値から色名を判定
function getColorName(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return '';
  const { h, s, l } = hexToHsl(hex);
  if (l >= 95) return '白';
  if (l <= 10) return '黒';
  if (s <= 15) return 'グレー';
  if (l > 80 && s < 30) return 'ベージュ';
  if (h >= 20 && h < 50) return '黄';
  if (h >= 50 && h < 85) return '黄緑';
  if (h >= 85 && h < 170) return '緑';
  if (h >= 170 && h < 200) return '水色';
  if (h >= 200 && h < 260) return '青';
  if (h >= 260 && h < 320) return '紫';
  if ((h >= 320 && h < 345) || (h >= 345 || h < 10)) return 'ピンク';
  if (h >= 10 && h < 20) return 'オレンジ';
  if (h >= 345 || h < 10) return '赤';
  return '茶';
}

const App: React.FC = () => {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [freeText, setFreeText] = useState('');
  const [finalColor, setFinalColor] = useState<string>('');
  const [pairColor, setPairColor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('colorHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [questions, setQuestions] = useState<typeof allQuestions>(getRandomQuestions(5));
  // ステップ管理: 0=最初, 1=質問中, 2=結果
  const [step, setStep] = useState<number>(0);
  // 現在の質問インデックス
  const [current, setCurrent] = useState<number>(0);

  const handleStart = () => {
    setQuestions(getRandomQuestions(5));
    setAnswers({});
    setFreeText('');
    setFinalColor('');
    setPairColor('');
    setError('');
    setStep(1);
    setCurrent(0);
  };

  const handleAnswer = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!answers[questions[current].key]) {
      setError('選択肢を選んでください');
      return;
    }
    setError('');
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setStep(2); // 結果表示へ
      handleResult();
    }
  };

  const handleResult = () => {
    setLoading(true);
    setFinalColor('');
    setPairColor('');
    try {
      const color = getPersonalizedColor(answers, history, freeText);
      setFinalColor(color);
      setPairColor(getPairColor(color));
      const newHistory = [...history, { date: new Date().toISOString(), answers, freeText, color }];
      setHistory(newHistory);
      localStorage.setItem('colorHistory', JSON.stringify(newHistory));
    } catch {
      setError('色の抽出に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setFreeText('');
    setFinalColor('');
    setPairColor('');
    setError('');
    setQuestions(getRandomQuestions(5));
    setCurrent(0);
  };

  // 色彩心理学＋重み付け＋自由記述＋ランダム性で色を決定
  const getPersonalizedColor = (answers: { [key: string]: string }, history: any[], freeText: string) => {
    const sum = [0, 0, 0];
    let totalWeight = 0;
    Object.keys(colorPsychology).forEach(key => {
      const ans = answers[key];
      const w = weights[key] || 1;
      if (ans && colorPsychology[key][ans]) {
        sum[0] += colorPsychology[key][ans][0] * w;
        sum[1] += colorPsychology[key][ans][1] * w;
        sum[2] += colorPsychology[key][ans][2] * w;
        totalWeight += w;
      }
    });
    // 自由記述欄のキーワード色を加味
    const kwColor = getKeywordColor(freeText);
    if (kwColor) {
      sum[0] += kwColor[0] * 1.2;
      sum[1] += kwColor[1] * 1.2;
      sum[2] += kwColor[2] * 1.2;
      totalWeight += 1.2;
    }
    // 履歴があれば、過去の色も少し加味する（パーソナライズ）
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (last && last.color && last.color.startsWith('#')) {
        const r = parseInt(last.color.slice(1, 3), 16);
        const g = parseInt(last.color.slice(3, 5), 16);
        const b = parseInt(last.color.slice(5, 7), 16);
        sum[0] += r * 0.5;
        sum[1] += g * 0.5;
        sum[2] += b * 0.5;
        totalWeight += 0.5;
      }
    }
    if (totalWeight === 0) return '#cccccc';
    // 加重平均
    let avg = sum.map(x => Math.round(x / totalWeight));
    // ランダム性を大きく（-30～+30）
    avg = avg.map(v => Math.max(0, Math.min(255, v + Math.floor(Math.random() * 61) - 30)));
    return rgbToHex(avg as [number, number, number]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff6b7 0%, #f8b6e0 100%)',
      color: '#2d2d2d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Yusei Magic', 'M PLUS Rounded 1c', 'Zen Maru Gothic', 'Meiryo', sans-serif",
      padding: '4vw 0',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 40,
        boxShadow: '0 8px 32px #f8b6e055',
        padding: '48px 6vw 48px 6vw',
        maxWidth: 520,
        width: '90%',
        minHeight: 480,
        margin: '0 auto',
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* トップ画面のみ表示 */}
        {step === 0 && (
          <>
            <div style={{
              fontFamily: "'Yusei Magic', 'M PLUS Rounded 1c', 'Zen Maru Gothic', 'Meiryo', sans-serif",
              fontWeight: 900,
              fontSize: 48,
              color: '#ff5ca7',
              letterSpacing: 3,
              marginBottom: 32,
              marginTop: 20,
              textShadow: '0 2px 8px #6decb9',
            }}>いろぞら診断</div>
            <button onClick={handleStart} style={{
              background: 'linear-gradient(90deg, #ff5ca7 0%, #ffe156 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 32,
              padding: '28px 56px',
              fontSize: 28,
              fontWeight: 800,
              boxShadow: '0 8px 32px #ff5ca799',
              cursor: 'pointer',
              position: 'relative',
              transform: 'none',
              transition: 'background 0.3s, transform 0.15s, box-shadow 0.15s',
              letterSpacing: 1.2,
              whiteSpace: 'nowrap',
              marginTop: 40,
              alignSelf: 'center',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 12px 36px #ffe15699'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 8px 32px #ff5ca799'}
            >
              あなたの今日の色を診断する
            </button>
            {/* 制作者Xボタン */}
            <a href="https://x.com/toe78560468" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                position: 'absolute',
                left: 32,
                bottom: 32,
                background: 'linear-gradient(90deg, #00bcd4 0%, #6decb9 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 24px',
                fontSize: 18,
                fontWeight: 700,
                boxShadow: '0 1px 4px #00bcd433',
                cursor: 'pointer',
                textDecoration: 'none',
                letterSpacing: 1,
                transition: 'background 0.3s, transform 0.15s, box-shadow 0.15s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px #6decb9'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 4px #00bcd433'}
            >
              制作者X
            </a>
          </>
        )}
        {step === 1 && (
          <>
            <div style={{
              fontWeight: 700,
              fontSize: '1.1em',
              color: '#ff5ca7',
              marginBottom: 14,
              lineHeight: 1.3,
              padding: '0 2vw',
              wordBreak: 'break-word',
            }}>{questions[current].label}</div>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px 8px', 
              marginBottom: 14,
              justifyContent: 'center',
              padding: '0 2vw',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              {questions[current].options.map(opt => (
                <label key={opt} style={{
                  marginBottom: 4,
                  fontSize: '1em',
                  color: '#2d2d2d',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '4px 8px',
                  background: answers[questions[current].key] === opt ? '#ffe15633' : 'transparent',
                  border: answers[questions[current].key] === opt ? '1.5px solid #00bcd4' : '1.5px solid #eee',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.15s, transform 0.12s',
                  boxShadow: answers[questions[current].key] === opt ? '0 2px 8px #00bcd433' : 'none',
                  minWidth: 60,
                  justifyContent: 'center',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <input
                    type="radio"
                    name={questions[current].key}
                    value={opt}
                    checked={answers[questions[current].key] === opt}
                    onChange={() => handleAnswer(questions[current].key, opt)}
                    style={{
                      width: 20,
                      height: 20,
                      accentColor: '#3498db',
                      marginRight: 6,
                    }}
                  />
                  {opt}
                </label>
              ))}
            </div>
            {/* 最後の質問なら自由記述欄を表示 */}
            {current === questions.length - 1 && (
              <div style={{ marginBottom: 14, textAlign: 'left', padding: '0 2vw' }}>
                <div style={{
                  marginBottom: 6,
                  fontWeight: 600,
                  fontSize: '1em',
                  color: '#00bcd4',
                  lineHeight: 1.3,
                }}>自由記述（キーワード例：海、花、森、太陽、夜、空、火、雪、夢、音楽 など）</div>
                <textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  rows={2}
                  style={{ width: '100%', fontSize: '1em', borderRadius: 8, border: '1.5px solid #ff5ca7', padding: 10, resize: 'vertical', minHeight: 40, transition: 'box-shadow 0.15s', background: '#fff6fa', boxSizing: 'border-box' }}
                  placeholder="自由に入力してください"
                  onFocus={e => e.currentTarget.style.boxShadow = '0 2px 8px #ff5ca7'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                />
              </div>
            )}
            <button onClick={handleNext} style={{
              background: 'linear-gradient(90deg, #ff5ca7 0%, #ffb347 50%, #ffe156 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 18,
              padding: '16px 0',
              fontSize: 'clamp(15px, 4vw, 18px)',
              fontWeight: 700,
              width: '100%',
              boxShadow: '0 4px 16px #ffb34755',
              cursor: 'pointer',
              marginTop: 10,
              transition: 'background 0.3s, transform 0.15s, box-shadow 0.15s',
              letterSpacing: 1.2,
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 20px #b3e0fc'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(52,152,219,0.10)'}
            disabled={loading}>
              {current === questions.length - 1 ? (loading ? '診断中...' : '診断結果を見る') : '次へ'}
            </button>
            {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
            {/* 質問中は右上にトップへ戻るボタン */}
            <button onClick={handleRestart} style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: '#f5faff',
              color: '#3498db',
              border: '1.5px solid #b3e0fc',
              borderRadius: 8,
              padding: '6px 16px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(52,152,219,0.04)',
              transition: 'background 0.2s, color 0.2s, transform 0.1s',
              zIndex: 2,
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >トップに戻る</button>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
              <div style={{
                width: 'clamp(100px, 30vw, 120px)',
                height: 'clamp(100px, 30vw, 120px)',
                background: finalColor && finalColor.startsWith('#') ? finalColor : '#e0e0e0',
                borderRadius: 20,
                border: '2.5px solid #eee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(20px, 5vw, 26px)',
                color: finalColor && finalColor.startsWith('#') ? '#ff5ca7' : '#888',
                margin: '0 auto',
                boxShadow: '0 2px 12px rgba(52,152,219,0.08)',
                marginBottom: 16,
                userSelect: 'all',
                fontWeight: 700,
                letterSpacing: 1,
                transition: 'background 0.3s',
              }}>
                {/* 色の四角のみ表示 */}
              </div>
              {/* 色名を表示 */}
              <div style={{ fontWeight: 700, fontSize: 18, color: '#ff5ca7', marginBottom: 2 }}>{getColorName(finalColor)}</div>
              {/* カラーコードを下に分けて表示 */}
              <div style={{
                fontWeight: 700,
                fontSize: 20,
                color: '#222',
                marginBottom: 16,
                userSelect: 'all',
                letterSpacing: 1,
              }}>{finalColor ? finalColor : '色がここに表示されます'}</div>
              {pairColor && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 0 }}>
                  {/* 相性の良い色の説明テキスト */}
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#00bcd4', marginBottom: 2, marginTop: 0, letterSpacing: 0.5 }}>
                    相性の良い色
                  </div>
                  <div style={{
                    width: 54,
                    height: 54,
                    background: pairColor,
                    borderRadius: 12,
                    border: '2px solid #eee',
                    boxShadow: '0 2px 8px rgba(52,152,219,0.08)',
                    marginBottom: 10,
                    transition: 'background 0.3s',
                  }} />
                  {/* 相性の良い色名を表示 */}
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#00bcd4', marginBottom: 2, marginTop: 0, letterSpacing: 0.5 }}>{getColorName(pairColor)}</div>
                  <div style={{
                    color: '#ff5ca7',
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: 1,
                    userSelect: 'all',
                    marginBottom: 0,
                  }}>{pairColor}</div>
                </div>
              )}
            </div>
            <button onClick={handleRestart} style={{
              margin: '36px auto 0',
              display: 'block',
              background: '#fff',
              color: '#00bcd4',
              border: '1.5px solid #ff5ca7',
              borderRadius: 10,
              padding: '12px 0',
              fontSize: 16,
              fontWeight: 600,
              width: 180,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #ff5ca733',
              transition: 'background 0.2s, color 0.2s, transform 0.12s, box-shadow 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 20px #b3e0fc'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(52,152,219,0.04)'}
            >
              もう一度診断
            </button>
            {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
