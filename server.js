const express = require('express');
const { Pool }  = require('pg');
const path      = require('path');

const app  = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── Инициализация БД ────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verbs (
      id       SERIAL PRIMARY KEY,
      infinitive TEXT NOT NULL UNIQUE,
      ru         TEXT NOT NULL,
      type       TEXT NOT NULL CHECK (type IN ('regular','irregular','reflexive'))
    );

    CREATE TABLE IF NOT EXISTS conjugations (
      id         SERIAL PRIMARY KEY,
      verb_id    INTEGER REFERENCES verbs(id) ON DELETE CASCADE,
      tense      TEXT NOT NULL,
      p0  TEXT, p1  TEXT, p2  TEXT,
      p3  TEXT, p4  TEXT, p5  TEXT,
      UNIQUE(verb_id, tense)
    );
  `);

  // Заполняем глаголами если таблица пустая
  const { rowCount } = await pool.query('SELECT 1 FROM verbs LIMIT 1');
  if (rowCount === 0) {
    console.log('Заполняем таблицу глаголов...');
    await seedVerbs();
    console.log('Готово!');
  }
}

// ─── Seed данные ─────────────────────────────
async function seedVerbs() {
  const verbs = [
    // [infinitive, ru, type, presente, indefinido, imperfecto, futuro, condicional, subjuntivo]
    ["hablar","говорить","regular",
      ["hablo","hablas","habla","hablamos","habláis","hablan"],
      ["hablé","hablaste","habló","hablamos","hablasteis","hablaron"],
      ["hablaba","hablabas","hablaba","hablábamos","hablabais","hablaban"],
      ["hablaré","hablarás","hablará","hablaremos","hablaréis","hablarán"],
      ["hablaría","hablarías","hablaría","hablaríamos","hablaríais","hablarían"],
      ["hable","hables","hable","hablemos","habléis","hablen"]],
    ["comer","есть/кушать","regular",
      ["como","comes","come","comemos","coméis","comen"],
      ["comí","comiste","comió","comimos","comisteis","comieron"],
      ["comía","comías","comía","comíamos","comíais","comían"],
      ["comeré","comerás","comerá","comeremos","comeréis","comerán"],
      ["comería","comerías","comería","comeríamos","comeríais","comerían"],
      ["coma","comas","coma","comamos","comáis","coman"]],
    ["vivir","жить","regular",
      ["vivo","vives","vive","vivimos","vivís","viven"],
      ["viví","viviste","vivió","vivimos","vivisteis","vivieron"],
      ["vivía","vivías","vivía","vivíamos","vivíais","vivían"],
      ["viviré","vivirás","vivirá","viviremos","viviréis","vivirán"],
      ["viviría","vivirías","viviría","viviríamos","viviríais","vivirían"],
      ["viva","vivas","viva","vivamos","viváis","vivan"]],
    ["trabajar","работать","regular",
      ["trabajo","trabajas","trabaja","trabajamos","trabajáis","trabajan"],
      ["trabajé","trabajaste","trabajó","trabajamos","trabajasteis","trabajaron"],
      ["trabajaba","trabajabas","trabajaba","trabajábamos","trabajabais","trabajaban"],
      ["trabajaré","trabajarás","trabajará","trabajaremos","trabajaréis","trabajarán"],
      ["trabajaría","trabajarías","trabajaría","trabajaríamos","trabajaríais","trabajarían"],
      ["trabaje","trabajes","trabaje","trabajemos","trabajéis","trabajen"]],
    ["escuchar","слушать","regular",
      ["escucho","escuchas","escucha","escuchamos","escucháis","escuchan"],
      ["escuché","escuchaste","escuchó","escuchamos","escuchasteis","escucharon"],
      ["escuchaba","escuchabas","escuchaba","escuchábamos","escuchabais","escuchaban"],
      ["escucharé","escucharás","escuchará","escucharemos","escucharéis","escucharán"],
      ["escucharía","escucharías","escucharía","escucharíamos","escucharíais","escucharían"],
      ["escuche","escuches","escuche","escuchemos","escuchéis","escuchen"]],
    ["escribir","писать","regular",
      ["escribo","escribes","escribe","escribimos","escribís","escriben"],
      ["escribí","escribiste","escribió","escribimos","escribisteis","escribieron"],
      ["escribía","escribías","escribía","escribíamos","escribíais","escribían"],
      ["escribiré","escribirás","escribirá","escribiremos","escribiréis","escribirán"],
      ["escribiría","escribirías","escribiría","escribiríamos","escribiríais","escribirían"],
      ["escriba","escribas","escriba","escribamos","escribáis","escriban"]],
    ["comprar","покупать","regular",
      ["compro","compras","compra","compramos","compráis","compran"],
      ["compré","compraste","compró","compramos","comprasteis","compraron"],
      ["compraba","comprabas","compraba","comprábamos","comprabais","compraban"],
      ["compraré","comprarás","comprará","compraremos","compraréis","comprarán"],
      ["compraría","comprarías","compraría","compraríamos","compraríais","comprarían"],
      ["compre","compres","compre","compremos","compréis","compren"]],
    ["beber","пить","regular",
      ["bebo","bebes","bebe","bebemos","bebéis","beben"],
      ["bebí","bebiste","bebió","bebimos","bebisteis","bebieron"],
      ["bebía","bebías","bebía","bebíamos","bebíais","bebían"],
      ["beberé","beberás","beberá","beberemos","beberéis","beberán"],
      ["bebería","beberías","bebería","beberíamos","beberíais","beberían"],
      ["beba","bebas","beba","bebamos","bebáis","beban"]],
    ["ser","быть (постоянно)","irregular",
      ["soy","eres","es","somos","sois","son"],
      ["fui","fuiste","fue","fuimos","fuisteis","fueron"],
      ["era","eras","era","éramos","erais","eran"],
      ["seré","serás","será","seremos","seréis","serán"],
      ["sería","serías","sería","seríamos","seríais","serían"],
      ["sea","seas","sea","seamos","seáis","sean"]],
    ["estar","быть (временно)","irregular",
      ["estoy","estás","está","estamos","estáis","están"],
      ["estuve","estuviste","estuvo","estuvimos","estuvisteis","estuvieron"],
      ["estaba","estabas","estaba","estábamos","estabais","estaban"],
      ["estaré","estarás","estará","estaremos","estaréis","estarán"],
      ["estaría","estarías","estaría","estaríamos","estaríais","estarían"],
      ["esté","estés","esté","estemos","estéis","estén"]],
    ["tener","иметь","irregular",
      ["tengo","tienes","tiene","tenemos","tenéis","tienen"],
      ["tuve","tuviste","tuvo","tuvimos","tuvisteis","tuvieron"],
      ["tenía","tenías","tenía","teníamos","teníais","tenían"],
      ["tendré","tendrás","tendrá","tendremos","tendréis","tendrán"],
      ["tendría","tendrías","tendría","tendríamos","tendríais","tendrían"],
      ["tenga","tengas","tenga","tengamos","tengáis","tengan"]],
    ["hacer","делать","irregular",
      ["hago","haces","hace","hacemos","hacéis","hacen"],
      ["hice","hiciste","hizo","hicimos","hicisteis","hicieron"],
      ["hacía","hacías","hacía","hacíamos","hacíais","hacían"],
      ["haré","harás","hará","haremos","haréis","harán"],
      ["haría","harías","haría","haríamos","haríais","harían"],
      ["haga","hagas","haga","hagamos","hagáis","hagan"]],
    ["ir","идти/ехать","irregular",
      ["voy","vas","va","vamos","vais","van"],
      ["fui","fuiste","fue","fuimos","fuisteis","fueron"],
      ["iba","ibas","iba","íbamos","ibais","iban"],
      ["iré","irás","irá","iremos","iréis","irán"],
      ["iría","irías","iría","iríamos","iríais","irían"],
      ["vaya","vayas","vaya","vayamos","vayáis","vayan"]],
    ["poder","мочь","irregular",
      ["puedo","puedes","puede","podemos","podéis","pueden"],
      ["pude","pudiste","pudo","pudimos","pudisteis","pudieron"],
      ["podía","podías","podía","podíamos","podíais","podían"],
      ["podré","podrás","podrá","podremos","podréis","podrán"],
      ["podría","podrías","podría","podríamos","podríais","podrían"],
      ["pueda","puedas","pueda","podamos","podáis","puedan"]],
    ["querer","хотеть","irregular",
      ["quiero","quieres","quiere","queremos","queréis","quieren"],
      ["quise","quisiste","quiso","quisimos","quisisteis","quisieron"],
      ["quería","querías","quería","queríamos","queríais","querían"],
      ["querré","querrás","querrá","querremos","querréis","querrán"],
      ["querría","querrías","querría","querríamos","querríais","querrían"],
      ["quiera","quieras","quiera","queramos","queráis","quieran"]],
    ["saber","знать","irregular",
      ["sé","sabes","sabe","sabemos","sabéis","saben"],
      ["supe","supiste","supo","supimos","supisteis","supieron"],
      ["sabía","sabías","sabía","sabíamos","sabíais","sabían"],
      ["sabré","sabrás","sabrá","sabremos","sabréis","sabrán"],
      ["sabría","sabrías","sabría","sabríamos","sabríais","sabrían"],
      ["sepa","sepas","sepa","sepamos","sepáis","sepan"]],
    ["venir","приходить","irregular",
      ["vengo","vienes","viene","venimos","venís","vienen"],
      ["vine","viniste","vino","vinimos","vinisteis","vinieron"],
      ["venía","venías","venía","veníamos","veníais","venían"],
      ["vendré","vendrás","vendrá","vendremos","vendréis","vendrán"],
      ["vendría","vendrías","vendría","vendríamos","vendríais","vendrían"],
      ["venga","vengas","venga","vengamos","vengáis","vengan"]],
    ["decir","говорить/сказать","irregular",
      ["digo","dices","dice","decimos","decís","dicen"],
      ["dije","dijiste","dijo","dijimos","dijisteis","dijeron"],
      ["decía","decías","decía","decíamos","decíais","decían"],
      ["diré","dirás","dirá","diremos","diréis","dirán"],
      ["diría","dirías","diría","diríamos","diríais","dirían"],
      ["diga","digas","diga","digamos","digáis","digan"]],
    ["ver","видеть","irregular",
      ["veo","ves","ve","vemos","veis","ven"],
      ["vi","viste","vio","vimos","visteis","vieron"],
      ["veía","veías","veía","veíamos","veíais","veían"],
      ["veré","verás","verá","veremos","veréis","verán"],
      ["vería","verías","vería","veríamos","veríais","verían"],
      ["vea","veas","vea","veamos","veáis","vean"]],
    ["dar","давать","irregular",
      ["doy","das","da","damos","dais","dan"],
      ["di","diste","dio","dimos","disteis","dieron"],
      ["daba","dabas","daba","dábamos","dabais","daban"],
      ["daré","darás","dará","daremos","daréis","darán"],
      ["daría","darías","daría","daríamos","daríais","darían"],
      ["dé","des","dé","demos","deis","den"]],
    ["poner","класть/ставить","irregular",
      ["pongo","pones","pone","ponemos","ponéis","ponen"],
      ["puse","pusiste","puso","pusimos","pusisteis","pusieron"],
      ["ponía","ponías","ponía","poníamos","poníais","ponían"],
      ["pondré","pondrás","pondrá","pondremos","pondréis","pondrán"],
      ["pondría","pondrías","pondría","pondríamos","pondríais","pondrían"],
      ["ponga","pongas","ponga","pongamos","pongáis","pongan"]],
    ["salir","выходить","irregular",
      ["salgo","sales","sale","salimos","salís","salen"],
      ["salí","saliste","salió","salimos","salisteis","salieron"],
      ["salía","salías","salía","salíamos","salíais","salían"],
      ["saldré","saldrás","saldrá","saldremos","saldréis","saldrán"],
      ["saldría","saldrías","saldría","saldríamos","saldríais","saldrían"],
      ["salga","salgas","salga","salgamos","salgáis","salgan"]],
    ["llamarse","называться","reflexive",
      ["me llamo","te llamas","se llama","nos llamamos","os llamáis","se llaman"],
      ["me llamé","te llamaste","se llamó","nos llamamos","os llamasteis","se llamaron"],
      ["me llamaba","te llamabas","se llamaba","nos llamábamos","os llamabais","se llamaban"],
      ["me llamaré","te llamarás","se llamará","nos llamaremos","os llamaréis","se llamarán"],
      ["me llamaría","te llamarías","se llamaría","nos llamaríamos","os llamaríais","se llamarían"],
      ["me llame","te llames","se llame","nos llamemos","os llaméis","se llamen"]],
    ["levantarse","вставать","reflexive",
      ["me levanto","te levantas","se levanta","nos levantamos","os levantáis","se levantan"],
      ["me levanté","te levantaste","se levantó","nos levantamos","os levantasteis","se levantaron"],
      ["me levantaba","te levantabas","se levantaba","nos levantábamos","os levantabais","se levantaban"],
      ["me levantaré","te levantarás","se levantará","nos levantaremos","os levantaréis","se levantarán"],
      ["me levantaría","te levantarías","se levantaría","nos levantaríamos","os levantaríais","se levantarían"],
      ["me levante","te levantes","se levante","nos levantemos","os levantéis","se levanten"]],
  ];

  const tenses = ["presente","indefinido","imperfecto","futuro","condicional","subjuntivo"];

  for (const [inf, ru, type, ...forms] of verbs) {
    const { rows } = await pool.query(
      `INSERT INTO verbs (infinitive, ru, type) VALUES ($1, $2, $3)
       ON CONFLICT (infinitive) DO UPDATE SET ru = EXCLUDED.ru, type = EXCLUDED.type
       RETURNING id`,
      [inf, ru, type]
    );
    const verbId = rows[0].id;

    for (let i = 0; i < tenses.length; i++) {
      const f = forms[i];
      await pool.query(
        `INSERT INTO conjugations (verb_id, tense, p0, p1, p2, p3, p4, p5)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (verb_id, tense) DO UPDATE
         SET p0=$3, p1=$4, p2=$5, p3=$6, p4=$7, p5=$8`,
        [verbId, tenses[i], ...f]
      );
    }
  }
}

// ─── API ─────────────────────────────────────

// Получить все глаголы с формами — для мини-аппа
app.get('/api/verbs', async (req, res) => {
  try {
    const { rows: verbRows } = await pool.query(
      'SELECT id, infinitive, ru, type, frequency FROM verbs ORDER BY infinitive'
    );
    const { rows: conjRows } = await pool.query(
      `SELECT verb_id, tense,
         p0, p1, p2, p3, p4, p5,
         COALESCE(p0_ru,'') p0_ru, COALESCE(p1_ru,'') p1_ru,
         COALESCE(p2_ru,'') p2_ru, COALESCE(p3_ru,'') p3_ru,
         COALESCE(p4_ru,'') p4_ru, COALESCE(p5_ru,'') p5_ru
       FROM conjugations`
    );

    // Собираем в объект { hablar: { ru, type, presente: [...], ... } }
    const result = {};
    for (const v of verbRows) {
      result[v.infinitive] = { ru: v.ru, type: v.type, frequency: v.frequency || 'all' };
    }
    for (const c of conjRows) {
      const verb = verbRows.find(v => v.id === c.verb_id);
      if (verb) {
        result[verb.infinitive][c.tense] = [c.p0, c.p1, c.p2, c.p3, c.p4, c.p5];
        const ruForms = [c.p0_ru, c.p1_ru, c.p2_ru, c.p3_ru, c.p4_ru, c.p5_ru];
        if (ruForms.some(Boolean)) {
          result[verb.infinitive][c.tense + '_ru'] = ruForms;
        }
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ─── Статика ─────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Старт ───────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
  .then(() => app.listen(PORT, () => console.log(`Verbolandia on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
