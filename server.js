const express = require('express');
const { Pool } = require('pg');
const path     = require('path');

const app  = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── API: все времена ────────────────────────────────────────────
app.get('/api/tenses', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT key, name_es, name_ru, mood, sort_order FROM tenses ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    console.error('/api/tenses error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: все глаголы со спряжениями ────────────────────────────
app.get('/api/verbs', async (req, res) => {
  try {
    // Узнаём какие колонки реально есть — не падаем если чего-то нет
    const { rows: conjCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'conjugations' AND table_schema = 'public'
    `);
    const { rows: verbCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'verbs' AND table_schema = 'public'
    `);

    const conjColSet = new Set(conjCols.map(c => c.column_name));
    const verbColSet = new Set(verbCols.map(c => c.column_name));

    const hasRu       = conjColSet.has('p0_ru');
    const hasTenseKey = conjColSet.has('tense_key');
    const hasFreq     = verbColSet.has('frequency');

    const tenseCol = hasTenseKey ? 'tense_key' : 'tense';

    const verbSelect = hasFreq
      ? 'SELECT id, infinitive, ru, type, frequency FROM verbs ORDER BY infinitive'
      : 'SELECT id, infinitive, ru, type FROM verbs ORDER BY infinitive';

    const ruPart = hasRu
      ? `, COALESCE(p0_ru,'') p0_ru, COALESCE(p1_ru,'') p1_ru,
           COALESCE(p2_ru,'') p2_ru, COALESCE(p3_ru,'') p3_ru,
           COALESCE(p4_ru,'') p4_ru, COALESCE(p5_ru,'') p5_ru`
      : `, ''::text p0_ru, ''::text p1_ru, ''::text p2_ru,
           ''::text p3_ru, ''::text p4_ru, ''::text p5_ru`;

    const conjSelect = `
      SELECT verb_id, ${tenseCol} AS tense,
             p0, p1, p2, p3, p4, p5 ${ruPart}
      FROM conjugations
    `;

    const { rows: verbRows } = await pool.query(verbSelect);
    const { rows: conjRows } = await pool.query(conjSelect);

    const result = {};
    const verbById = {};

    for (const v of verbRows) {
      verbById[v.id] = v.infinitive;
      result[v.infinitive] = {
        ru:        v.ru,
        type:      v.type,
        frequency: v.frequency || 'all'
      };
    }

    for (const c of conjRows) {
      const inf = verbById[c.verb_id];
      if (!inf) continue;
      result[inf][c.tense] = [c.p0, c.p1, c.p2, c.p3, c.p4, c.p5];
      const ruForms = [c.p0_ru, c.p1_ru, c.p2_ru, c.p3_ru, c.p4_ru, c.p5_ru];
      if (ruForms.some(Boolean)) {
        result[inf][c.tense + '_ru'] = ruForms;
      }
    }

    res.json(result);
  } catch (err) {
    console.error('/api/verbs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Статика ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Старт ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

pool.query('SELECT 1')
  .then(() => {
    console.log('✅ БД подключена');
    app.listen(PORT, () => console.log(`🚀 Verbolandia запущен на порту ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Не удалось подключиться к БД:', err.message);
    process.exit(1);
  });
