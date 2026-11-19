/*
  TRADUCCIONES · inglés, japonés y chino (simplificado)
  ─────────────────────────────────────────────────────
  - textos:   textos fijos de la página (claves data-i18n del index.html).
              El español es el que está escrito en el propio index.html.
  - platos:   nombre y descripción en japonés / chino, por nombre del plato
              (el mismo "n" de js/carta-datos.js). Si un plato no está aquí,
              se enseña en inglés.
  - secciones, cocinas, lemas, intros, alergenos: lo demás de la carta.
*/

window.TRAD = {
  idiomas: [
    { id: 'es', corto: 'ES', nombre: 'Español', html: 'es' },
    { id: 'en', corto: 'EN', nombre: 'English', html: 'en' },
    { id: 'ja', corto: '日本語', nombre: '日本語', html: 'ja' },
    { id: 'zh', corto: '中文', nombre: '中文（简体）', html: 'zh-Hans' }
  ],

  textos: {
    en: {
      'nav.carta': 'Menu', 'nav.casa': 'Our story', 'nav.barra': 'Bar', 'nav.visita': 'Find us',
      'cta.reservar': 'Book a table', 'cta.carta': 'See the menu',
      'hero.ante': 'Restobar · Santa Justa · Seville',
      'hero.t1': 'Ceviche and ensaladilla,', 'hero.t2': 'at the same table.',
      'hero.sub': 'Peruvian creole cooking and classic Sevillian tapas on Avenida de El Greco. A terrace on the street, tiles inside and a well-shaken pisco sour.',
      'hero.d1': '168 Google reviews', 'hero.d2': 'dishes on the menu', 'hero.d3a': 'Tapa', 'hero.d3': 'or full plate',
      'casa.pie': 'Av. de El Greco, 4 · the old Enea',
      'casa.ante': 'Our story', 'casa.titulo': 'A flower <em>from Lima</em>',
      'casa.p1': 'It’s named after Chabuca Granda’s waltz, the song every Peruvian knows by heart. Behind it is Dani Maguiño, who in 2006 opened what he remembers as Seville’s first Peruvian restaurant, on Plaza Pintor Amalio García del Moral.',
      'casa.p2': 'Today that kitchen lives on Avenida de El Greco: a street terrace with wrought-iron grilles, a blue-and-white tiled dining room, wooden tables and a menu split in two. On one side, ceviche, causa and wok-tossed lomo saltado. On the other, serranito, fried cuttlefish and oxtail stew.',
      'casa.c1': 'cooking Peru in Seville', 'casa.c2': 'kitchens, one table', 'casa.c3': 'allergens marked on the menu',
      'coc.ante': 'Two kitchens', 'coc.titulo': 'Order from both. <em>Share.</em>',
      'coc.pe.t': 'Peruvian kitchen', 'coc.pe.p': 'Ceviche with tiger’s milk, causa limeña, anticuchos, ají de gallina and everything from the wok: lomo saltado, chaufa, tipakay. Creole and chifa, just like in Lima.', 'coc.pe.cta': 'See Peruvian dishes',
      'coc.es.t': 'Spanish kitchen', 'coc.es.p': 'Classic tapas: serranito, pork in whisky sauce, fried cuttlefish, marinated dogfish, oxtail and pork cheeks. With an ice-cold Cruzcampo.', 'coc.es.cta': 'See Spanish dishes',
      'est.ante': 'To start', 'est.titulo': 'What you <em>have to try</em>', 'est.cta': 'Full menu',
      'carta.ante': 'Digital menu', 'carta.titulo': 'The <em>menu</em>',
      'carta.intro': 'Almost everything comes as a tapa or a full plate. Best way: order from both kitchens and share.',
      'carta.tab.pe': 'Peruvian', 'carta.tab.es': 'Spanish', 'carta.tab.pb': 'Desserts & drinks', 'carta.alerg': 'Allergens',
      'carta.ph': 'Search: ceviche, chaufa, serranito…',
      'carta.pa.t': 'Hide dishes that contain:', 'carta.pa.nota': 'Based on the restaurant’s menu. If you have an allergy, always tell your server.', 'carta.pa.limpiar': 'Clear filters',
      'carta.legal': 'If you have any allergy or intolerance, let us know and we’ll tell you what’s in every dish.',
      'barra.ante': 'The bar', 'barra.titulo': 'Pisco sour, Cusqueña <em>and Inka Kola</em>',
      'barra.p': 'Ice-cold Peruvian beer, Inka Kola in three sizes, pisco sour and sangria. And to finish, four cakes.',
      'barra.b1': 'Pisco sour', 'barra.b2': 'Sangria', 'barra.b3': 'Cusqueña lager & dark', 'barra.b4': 'Pilsen Callao', 'barra.b5': 'Inka Kola', 'barra.b6': 'Cakes',
      'barra.cta': 'See drinks & desserts',
      'res.ante': 'Book', 'res.titulo': 'Save us <em>a table</em>',
      'res.p': 'Fill this in and WhatsApp opens with the message ready. We’ll reply there to confirm.',
      'res.thefork': 'Also on TheFork',
      'res.f.nombre': 'Name', 'res.f.nombre.ph': 'Your name', 'res.f.personas': 'Guests', 'res.f.dia': 'Day', 'res.f.hora': 'Time', 'res.f.zona': 'Where',
      'res.f.terraza': 'Terrace', 'res.f.dentro': 'Inside', 'res.f.notas': 'Anything we should know (optional)', 'res.f.notas.ph': 'Birthday, pram, allergies…',
      'res.f.enviar': 'Request a table on WhatsApp',
      'vis.ante': 'Find us', 'vis.titulo': 'Av. de El Greco, 4 <em>Seville</em>',
      'vis.p': 'In the San Pablo – Santa Justa neighbourhood, 41007. Street terrace and indoor dining room.',
      'vis.horario': 'Opening hours', 'vis.horario.v': 'Call or WhatsApp us and we’ll tell you if there’s a table.',
      'vis.tel': 'Phone & WhatsApp', 'vis.como': 'Get directions',
      'pie.lema': 'Peruvian & Spanish kitchen', 'pie.fotos': 'Photos of the restaurant and its dishes.',
      'bm.carta': 'Menu', 'bm.llamar': 'Call', 'bm.reservar': 'Book', 'bm.llegar': 'Directions',
      'cred.carta': 'Digital menu made by', 'cred.pie': 'Website and digital menu made by'
    },

    ja: {
      'nav.carta': 'メニュー', 'nav.casa': '私たちについて', 'nav.barra': 'バー', 'nav.visita': 'アクセス',
      'cta.reservar': '席を予約', 'cta.carta': 'メニューを見る',
      'hero.ante': 'レストバー · サンタ・フスタ · セビリア',
      'hero.t1': 'セビーチェとエンサラディージャを、', 'hero.t2': '同じテーブルで。',
      'hero.sub': 'ペルーのクリオージャ料理と、昔ながらのセビリアのタパス。エル・グレコ通りの、通りに面したテラスとタイル張りの店内で、しっかりシェイクしたピスコサワーを。',
      'hero.d1': 'Google レビュー 168件', 'hero.d2': '品のメニュー', 'hero.d3a': 'タパ', 'hero.d3': 'またはラシオン',
      'casa.pie': 'エル・グレコ通り4番地 · 旧エネア',
      'casa.ante': '私たちについて', 'casa.titulo': 'リマから届いた<em>一輪の花</em>',
      'casa.p1': '店名は、ペルーで誰もが口ずさむチャブーカ・グランダのワルツから。オーナーのダニ・マギーニョは2006年、ピントール・アマリオ・ガルシア・デル・モラル広場に、本人いわく「セビリア初のペルー料理店」を開きました。',
      'casa.p2': 'その味は今、エル・グレコ通りに受け継がれています。鉄格子のある通り沿いのテラス、青と白のタイルの店内、木のテーブル、そして二つに分かれたメニュー。片方にはセビーチェ、カウサ、ウォックで炒めるロモ・サルタード。もう片方にはセラニート、コウイカのフライ、牛テールの煮込み。',
      'casa.c1': 'セビリアでペルー料理を', 'casa.c2': 'つの料理、ひとつのテーブル', 'casa.c3': '種のアレルゲンをメニューに表示',
      'coc.ante': '二つの料理', 'coc.titulo': '両方から頼んで、<em>みんなでシェア。</em>',
      'coc.pe.t': 'ペルー料理', 'coc.pe.p': 'レチェ・デ・ティグレのセビーチェ、カウサ・リメーニャ、アンティクーチョ、アヒ・デ・ガジーナ、そしてロモ・サルタード、チャウファ、ティパカイなどのウォック料理。リマそのままのクリオージャとチーファ（ペルー風中華）。', 'coc.pe.cta': 'ペルー料理を見る',
      'coc.es.t': 'スペイン料理', 'coc.es.p': '昔ながらのタパス：セラニート、ヒレ肉のウイスキーソース、コウイカのフライ、カソン・エン・アドボ、牛テールと豚ほほ肉の煮込み。キンキンに冷えたクルスカンポと一緒に。', 'coc.es.cta': 'スペイン料理を見る',
      'est.ante': 'まずはこちら', 'est.titulo': 'ぜひ<em>味わってほしい</em>一皿', 'est.cta': 'メニュー全体',
      'carta.ante': 'デジタルメニュー', 'carta.titulo': '<em>メニュー</em>',
      'carta.intro': 'ほとんどの料理はタパ（小皿）かラシオン（大皿）で注文できます。両方の料理を頼んでシェアするのがおすすめです。',
      'carta.tab.pe': 'ペルー料理', 'carta.tab.es': 'スペイン料理', 'carta.tab.pb': 'デザート・ドリンク', 'carta.alerg': 'アレルゲン',
      'carta.ph': '検索：セビーチェ、チャウファ…',
      'carta.pa.t': '次を含む料理を非表示：', 'carta.pa.nota': '店のメニューに基づく情報です。アレルギーがある場合は必ずスタッフにお伝えください。', 'carta.pa.limpiar': 'フィルターを解除',
      'carta.legal': 'アレルギーや食事制限がある場合はお知らせください。各料理の内容をご説明します。',
      'barra.ante': 'バー', 'barra.titulo': 'ピスコサワー、クスケーニャ、<em>インカ・コーラ</em>',
      'barra.p': 'よく冷えたペルービール、3サイズのインカ・コーラ、ピスコサワーにサングリア。締めにはケーキが4種類。',
      'barra.b1': 'ピスコサワー', 'barra.b2': 'サングリア', 'barra.b3': 'クスケーニャ（ラガー・黒）', 'barra.b4': 'ピルセン・カヤオ', 'barra.b5': 'インカ・コーラ', 'barra.b6': 'ケーキ',
      'barra.cta': 'ドリンクとデザートを見る',
      'res.ante': '予約', 'res.titulo': '<em>お席を</em>ご用意します',
      'res.p': '入力すると、メッセージ入りの WhatsApp が開きます。確認のご返信も WhatsApp でお送りします。',
      'res.thefork': 'TheFork でも予約できます',
      'res.f.nombre': 'お名前', 'res.f.nombre.ph': 'お名前', 'res.f.personas': '人数', 'res.f.dia': '日付', 'res.f.hora': '時間', 'res.f.zona': '席',
      'res.f.terraza': 'テラス', 'res.f.dentro': '店内', 'res.f.notas': 'ご要望（任意）', 'res.f.notas.ph': '誕生日、ベビーカー、アレルギーなど',
      'res.f.enviar': 'WhatsApp で予約する',
      'res.f.aviso': 'メッセージはお店のスタッフ向けにスペイン語で作成されます。',
      'vis.ante': 'アクセス', 'vis.titulo': 'エル・グレコ通り4番地 <em>セビリア</em>',
      'vis.p': 'サン・パブロ～サンタ・フスタ地区（41007）。通りに面したテラス席と店内席があります。',
      'vis.horario': '営業時間', 'vis.horario.v': 'お電話または WhatsApp でお問い合わせください。空席をお知らせします。',
      'vis.tel': '電話・WhatsApp', 'vis.como': '道順を見る',
      'pie.lema': 'ペルー料理とスペイン料理', 'pie.fotos': '写真：店内と料理。',
      'bm.carta': 'メニュー', 'bm.llamar': '電話', 'bm.reservar': '予約', 'bm.llegar': '道順',
      'cred.carta': 'デジタルメニュー制作：', 'cred.pie': 'ウェブサイト・デジタルメニュー制作：'
    },

    zh: {
      'nav.carta': '菜单', 'nav.casa': '关于我们', 'nav.barra': '酒吧', 'nav.visita': '交通位置',
      'cta.reservar': '预订座位', 'cta.carta': '查看菜单',
      'hero.ante': '餐酒吧 · 圣胡斯塔 · 塞维利亚',
      'hero.t1': '柠汁腌鱼配土豆沙拉，', 'hero.t2': '同桌共享。',
      'hero.sub': '秘鲁克里奥尔菜与地道塞维利亚小吃，就在埃尔·格列柯大道。临街露台、瓷砖装饰的店内，还有摇得恰到好处的皮斯科酸酒。',
      'hero.d1': '168 条 Google 评价', 'hero.d2': '道菜品', 'hero.d3a': '小份', 'hero.d3': '或大份',
      'casa.pie': '埃尔·格列柯大道4号 · 原 Enea 餐厅',
      'casa.ante': '关于我们', 'casa.titulo': '一朵来自<em>利马</em>的花',
      'casa.p1': '店名取自秘鲁家喻户晓的恰布卡·格兰达同名华尔兹。店主达尼·马吉尼奥于2006年在皮恩托尔·阿马利奥·加西亚·德尔·莫拉尔广场开了一家餐厅，据他回忆，那是塞维利亚第一家秘鲁餐厅。',
      'casa.p2': '如今，这份味道在埃尔·格列柯大道延续：带铁艺窗栅的临街露台、蓝白瓷砖的餐厅、木桌，以及一分为二的菜单。一边是柠汁腌鱼、利马土豆塔和大火爆炒的秘鲁炒牛柳；另一边是塞维利亚三明治、炸墨鱼和炖牛尾。',
      'casa.c1': '起在塞维利亚做秘鲁菜', 'casa.c2': '种菜系，一张餐桌', 'casa.c3': '种过敏原标注在菜单上',
      'coc.ante': '两种菜系', 'coc.titulo': '两边都点，<em>一起分享。</em>',
      'coc.pe.t': '秘鲁菜', 'coc.pe.p': '虎奶柠汁腌鱼、利马土豆塔、烤牛心串、黄辣椒奶油鸡，以及各种镬炒菜：秘鲁炒牛柳、秘鲁炒饭、罗望子酱鸡。地道的利马克里奥尔菜与秘鲁中餐（Chifa）。', 'coc.pe.cta': '查看秘鲁菜',
      'coc.es.t': '西班牙菜', 'coc.es.p': '经典小吃：塞维利亚三明治、威士忌酱里脊、炸墨鱼、腌炸鲨鱼块、炖牛尾和炖猪脸颊肉。再配一杯冰镇 Cruzcampo 啤酒。', 'coc.es.cta': '查看西班牙菜',
      'est.ante': '先尝这些', 'est.titulo': '<em>必尝</em>推荐', 'est.cta': '完整菜单',
      'carta.ante': '电子菜单', 'carta.titulo': '<em>菜单</em>',
      'carta.intro': '大多数菜品可点小份（Tapa）或大份（Ración）。推荐两种菜系都点，一起分享。',
      'carta.tab.pe': '秘鲁菜', 'carta.tab.es': '西班牙菜', 'carta.tab.pb': '甜点与饮品', 'carta.alerg': '过敏原',
      'carta.ph': '搜索：ceviche、炒饭……',
      'carta.pa.t': '隐藏含有以下成分的菜品：', 'carta.pa.nota': '信息依据餐厅菜单。如有过敏，请务必告知服务员。', 'carta.pa.limpiar': '清除筛选',
      'carta.legal': '如有过敏或饮食禁忌，请告诉我们，我们会说明每道菜的成分。',
      'barra.ante': '酒吧', 'barra.titulo': '皮斯科酸酒、库斯科啤酒<em>和印加可乐</em>',
      'barra.p': '冰镇秘鲁啤酒、三种规格的印加可乐、皮斯科酸酒和西班牙水果酒。餐后还有四款蛋糕。',
      'barra.b1': '皮斯科酸酒', 'barra.b2': '西班牙水果酒', 'barra.b3': '库斯科金啤与黑啤', 'barra.b4': '卡亚俄比尔森啤酒', 'barra.b5': '印加可乐', 'barra.b6': '蛋糕',
      'barra.cta': '查看饮品与甜点',
      'res.ante': '预订', 'res.titulo': '为您<em>留个座位</em>',
      'res.p': '填写后会打开 WhatsApp 并自动生成消息。我们会通过 WhatsApp 回复确认。',
      'res.thefork': '也可在 TheFork 预订',
      'res.f.nombre': '姓名', 'res.f.nombre.ph': '您的姓名', 'res.f.personas': '人数', 'res.f.dia': '日期', 'res.f.hora': '时间', 'res.f.zona': '座位',
      'res.f.terraza': '露台', 'res.f.dentro': '室内', 'res.f.notas': '备注（选填）', 'res.f.notas.ph': '生日、婴儿车、过敏等',
      'res.f.enviar': '通过 WhatsApp 预订',
      'res.f.aviso': '消息将以西班牙语生成，方便店员阅读。',
      'vis.ante': '交通位置', 'vis.titulo': '埃尔·格列柯大道4号 <em>塞维利亚</em>',
      'vis.p': '位于圣巴勃罗–圣胡斯塔街区（41007）。设有临街露台和室内座位。',
      'vis.horario': '营业时间', 'vis.horario.v': '请致电或通过 WhatsApp 联系我们，我们会告知是否有空位。',
      'vis.tel': '电话与 WhatsApp', 'vis.como': '获取路线',
      'pie.lema': '秘鲁菜与西班牙菜', 'pie.fotos': '照片：店内与菜品。',
      'bm.carta': '菜单', 'bm.llamar': '致电', 'bm.reservar': '预订', 'bm.llegar': '路线',
      'cred.carta': '电子菜单制作：', 'cred.pie': '网站与电子菜单制作：'
    }
  },

  cocinas: {
    peru:    { ja: 'ペルー料理', zh: '秘鲁菜' },
    sevilla: { ja: 'スペイン料理', zh: '西班牙菜' },
    dulce:   { ja: 'デザート・ドリンク', zh: '甜点与饮品' }
  },

  lemas: {
    peru:    { ja: 'リマ仕込みのクリオージャとチーファ', zh: '利马风味的克里奥尔菜与秘鲁中餐' },
    sevilla: { ja: '昔ながらのセビリアのタパス', zh: '地道的塞维利亚小吃' },
    dulce:   { ja: '締めにも、始まりにも', zh: '餐后甜点，餐前小酌' }
  },

  secciones: {
    'pe-entradas':   { ja: '前菜', zh: '开胃菜' },
    'pe-frituras':   { ja: '揚げ物', zh: '炸物' },
    'pe-guisos':     { ja: '煮込み料理', zh: '炖菜' },
    'pe-wok':        { ja: 'ウォック料理', zh: '镬炒菜' },
    'pe-mar':        { ja: 'ペルーの魚介料理', zh: '秘鲁海鲜' },
    'es-entradas':   { ja: '前菜', zh: '开胃菜' },
    'es-carnes':     { ja: '肉料理', zh: '肉类' },
    'es-mar':        { ja: '魚介料理', zh: '海鲜' },
    'es-guisos':     { ja: '煮込み料理', zh: '炖菜' },
    'es-montaditos': { ja: 'モンタディート（ミニサンド）', zh: '迷你三明治' },
    'pb-tartas':     { ja: 'ケーキ', zh: '蛋糕' },
    'pb-cervezas':   { ja: 'ペルービール', zh: '秘鲁啤酒' },
    'pb-refrescos':  { ja: 'インカ・コーラ', zh: '印加可乐' },
    'pb-cocteles':   { ja: 'カクテル', zh: '鸡尾酒' }
  },

  intros: {
    'pb-refrescos': { ja: 'ペルーの黄金色のソーダ。', zh: '秘鲁的金色汽水。' }
  },

  notas: {
    'Bajo pedido': { ja: '要事前注文', zh: '需提前预订' }
  },

  alergenos: {
    ja: { 1: 'グルテン', 2: '甲殻類', 3: '卵', 4: '魚', 5: '落花生', 6: '大豆', 7: '乳製品', 8: 'ナッツ類', 9: 'セロリ', 10: 'マスタード', 11: 'ごま', 12: '亜硫酸塩', 13: 'ルピナス', 14: '軟体動物' },
    zh: { 1: '麸质', 2: '甲壳类', 3: '蛋', 4: '鱼', 5: '花生', 6: '大豆', 7: '乳制品', 8: '坚果', 9: '芹菜', 10: '芥末', 11: '芝麻', 12: '亚硫酸盐', 13: '羽扇豆', 14: '软体动物' }
  },

  /* [nombre, descripción] */
  platos: {
    /* ── Cocina peruana ── */
    'Papa a la huancaína': {
      ja: ['パパ・ア・ラ・ワンカイナ', '茹でたじゃがいもに、黄唐辛子（アヒ・アマリージョ）のクリームソース。'],
      zh: ['黄辣椒奶酱土豆', '水煮土豆淋上秘鲁黄辣椒奶油酱。'] },
    'Yuca frita': {
      ja: ['ユカ・フリタ', 'キャッサバのフライ。外はカリッと、中はほくほく。'],
      zh: ['炸木薯条', '外脆里糯的炸木薯条。'] },
    'Causa limeña': {
      ja: ['カウサ・リメーニャ', '味付けした黄色いじゃがいもを重ね、鶏肉・アボカド・マヨネーズを挟んだリマの名物。'],
      zh: ['利马土豆塔', '调味黄土豆泥层层叠起，夹鸡肉、牛油果和蛋黄酱。'] },
    'Papa rellena': {
      ja: ['パパ・レジェーナ', 'マッシュポテトに、味付けひき肉・ゆで卵・スパイスを詰めたもの。'],
      zh: ['秘鲁酿土豆', '土豆泥包裹调味肉末、熟鸡蛋和香料。'] },
    'Wantán frito': {
      ja: ['揚げワンタン', '味付けした肉を小麦の皮で包んだ、中華風のワンタン。'],
      zh: ['炸馄饨', '小麦面皮包裹中式调味肉馅。'] },
    'Tequeños fritos': {
      ja: ['テケーニョス', '小麦の生地で、チーズまたはアヒ・デ・ガジーナを包んだもの。'],
      zh: ['炸面皮卷', '小麦面皮卷入奶酪或黄辣椒奶油鸡。'] },
    'Chicharrón de cerdo': {
      ja: ['豚のチチャロン', '揚げた豚肉に、さつまいものフライとサルサ・クリオージャを添えて。'],
      zh: ['秘鲁炸猪肉', '炸猪肉块配炸红薯和克里奥尔洋葱莎莎。'] },
    'Brocheta de pollo': {
      ja: ['鶏肉の串焼き', 'ペルーの唐辛子でマリネした鶏肉。'],
      zh: ['鸡肉串', '用秘鲁辣椒腌制的鸡肉。'] },
    'Anticuchos de res': {
      ja: ['アンティクーチョ（牛ハツ串）', 'アンティクーチョソースに漬けた牛ハツ。'],
      zh: ['秘鲁烤牛心串', '用秘鲁烤串酱腌制的牛心。'] },
    'Salchipapa': {
      ja: ['サルチパパ', 'ソーセージとフライドポテト。リマの屋台の定番。'],
      zh: ['香肠薯条', '香肠配薯条，利马街头经典。'] },
    'Seco a la norteña': {
      ja: ['セコ・ア・ラ・ノルテーニャ', '牛肉の煮込み。ご飯とキャッサバ添え。'],
      zh: ['北部风味炖牛肉', '炖牛肉配米饭和木薯。'] },
    'Pato en ají': {
      ja: ['鴨のアヒ煮込み', 'ペルー唐辛子のクリームソースで煮込んだ鴨肉。ご飯と付け合わせ付き。'],
      zh: ['辣椒奶油炖鸭', '秘鲁辣椒奶油酱炖鸭肉，配米饭和配菜。'] },
    'Ají de gallina': {
      ja: ['アヒ・デ・ガジーナ', '裂いた鶏肉を、唐辛子とチーズのクリームソースで。ご飯と茹でじゃがいも添え。'],
      zh: ['黄辣椒奶油鸡', '手撕鸡肉拌辣椒奶酪奶油酱，配米饭和水煮土豆。'] },
    'Sopa García': {
      ja: ['ソパ・ガルシア', '肉、野菜、麺、卵焼きの細切りが入った鶏スープ。揚げワンタン添え。'],
      zh: ['加西亚汤', '鸡汤配肉块、蔬菜、面条和蛋饼丝，附炸馄饨。'] },
    'Arroz chaufa': {
      ja: ['アロス・チャウファ（ペルー風チャーハン）', '鶏肉または豚肉、卵、ねぎ、醤油のペルー風中華チャーハン。'],
      zh: ['秘鲁炒饭', '中秘融合炒饭，配鸡肉或猪肉、鸡蛋、葱和酱油。'] },
    'Lomo saltado': {
      ja: ['ロモ・サルタード', '牛ヒレ肉を玉ねぎ・トマト・唐辛子とウォックで炒め、フライドポテトを添えて。'],
      zh: ['秘鲁炒牛柳', '牛里脊与洋葱、番茄、辣椒大火爆炒，配炸薯条。'] },
    'Tallarín saltado': {
      ja: ['タジャリン・サルタード', '肉と野菜の醤油焼きそば。'],
      zh: ['秘鲁炒面', '肉、蔬菜和酱油炒面。'] },
    'Chancho con tamarindo': {
      ja: ['豚肉のタマリンドソース', '揚げた豚肉をタマリンドソースで炒めたもの。'],
      zh: ['罗望子酱猪肉', '炸猪肉块以罗望子酱翻炒。'] },
    'Tipakay': {
      ja: ['ティパカイ', '揚げた鶏肉をタマリンドソースで炒めたもの。'],
      zh: ['罗望子酱鸡', '炸鸡块以罗望子酱翻炒。'] },
    'Aeropuerto': {
      ja: ['アエロプエルト', 'チャウファ（チャーハン）と焼きそばを一皿に盛り合わせた中華風料理。'],
      zh: ['“机场”炒饭面', '秘鲁炒饭与炒面同盘，中式风味。'] },
    'Lomo saltado con chaufa': {
      ja: ['ロモ・サルタードとチャウファ', 'ロモ・サルタードにペルー風チャーハンを添えて。'],
      zh: ['秘鲁炒牛柳配炒饭', '秘鲁炒牛柳配秘鲁炒饭。'] },
    'Chancho con tamarindo con chaufa': {
      ja: ['豚肉のタマリンドソースとチャウファ', 'タマリンドソースの豚肉に、ペルー風チャーハンを添えて。'],
      zh: ['罗望子酱猪肉配炒饭', '罗望子酱猪肉配秘鲁炒饭。'] },
    'Tipakay con chaufa': {
      ja: ['ティパカイとチャウファ', 'タマリンドソースの鶏肉に、ペルー風チャーハンを添えて。'],
      zh: ['罗望子酱鸡配炒饭', '罗望子酱鸡配秘鲁炒饭。'] },
    'Ceviche': {
      ja: ['セビーチェ', 'レチェ・デ・ティグレとライムでマリネした魚。紫玉ねぎ、唐辛子、パクチー、ペルーの大粒とうもろこし、さつまいも添え。'],
      zh: ['秘鲁柠汁腌鱼', '鱼肉以虎奶汁和青柠腌制，配紫洋葱、辣椒、香菜、秘鲁大粒玉米和红薯。'] },
    'Leche de tigre': {
      ja: ['レチェ・デ・ティグレ', 'セビーチェのマリネ液。カリッと揚げた魚、キャッサバ、魚の切り身入り。'],
      zh: ['虎奶', '柠汁腌鱼的汤汁，配酥炸鱼块、木薯和鱼肉丁。'] },
    'Chicharrón de pescado': {
      ja: ['魚のチチャロン', 'マリネした魚に衣をつけて揚げたもの。'],
      zh: ['秘鲁炸鱼块', '腌制后裹粉油炸的鱼块。'] },
    'Arroz con mariscos': {
      ja: ['アロス・コン・マリスコス', '新鮮な魚介、唐辛子、スパイスで炒めたご飯。'],
      zh: ['秘鲁海鲜饭', '新鲜海鲜、辣椒和香料炒饭。'] },
    'Parihuela': {
      ja: ['パリウエラ', '唐辛子、ハーブ、スパイスで仕立てた魚介スープ。魚介と鯛の切り身入り。'],
      zh: ['秘鲁海鲜汤', '用辣椒、香草和香料熬制的鱼及海鲜汤，配海鲜和一片鲷鱼。'] },

    /* ── Cocina española ── */
    'Ensaladilla': {
      ja: ['エンサラディージャ', '昔ながらのスペイン風ポテトサラダ。'],
      zh: ['西班牙土豆沙拉', '经典西班牙土豆沙拉。'] },
    'Pimientos asados con melva': {
      ja: ['焼きパプリカとメルバ', '焼きパプリカに、メルバ（ヒラソウダ）を添えて。'],
      zh: ['烤甜椒配扁舵鲣', '烤甜椒配扁舵鲣（melva）。'] },
    'Berenjenas con miel de caña': {
      ja: ['揚げなすのサトウキビ蜜がけ', 'カリッと揚げたなすに、サトウキビの蜜をかけて。'],
      zh: ['蔗糖蜜炸茄子', '酥炸茄子淋甘蔗蜜。'] },
    'Tortillitas de camarones': {
      ja: ['小エビのトルティジータ', 'カディス風の、薄くてカリカリの小エビのかき揚げ。'],
      zh: ['炸小虾薄饼', '加的斯风味的酥脆小虾薄饼。'] },
    'Croquetas de rabo de toro': {
      ja: ['牛テールのコロッケ', 'クリーミーな牛テールのクロケタ。'],
      zh: ['牛尾可乐饼', '奶油口感的牛尾可乐饼。'] },
    'Huevos rotos con jamón': {
      ja: ['ウエボス・ロトス（生ハム添え）', 'フライドポテトに、目玉焼きと生ハム。'],
      zh: ['火腿碎蛋薯条', '炸薯条配煎蛋和西班牙火腿。'] },
    'Queso curado': {
      ja: ['熟成チーズ', 'スライスした熟成チーズ。'],
      zh: ['陈年奶酪', '切片陈年奶酪。'] },
    'Patatas con alioli': {
      ja: ['ポテトのアリオリ', 'じゃがいもに、ガーリックマヨネーズ（アリオリ）。'],
      zh: ['蒜泥蛋黄酱土豆', '土豆配蒜泥蛋黄酱。'] },
    'Solomillo al whisky': {
      ja: ['ソロミージョ・アル・ウイスキー', 'セビリアの定番：ヒレ肉のにんにくとウイスキーソース。'],
      zh: ['威士忌酱里脊', '塞维利亚经典：蒜香威士忌酱里脊。'] },
    'Presa ibérica': {
      ja: ['イベリコ豚のプレサ', 'イベリコ豚の肩ロースの鉄板焼き。'],
      zh: ['伊比利亚猪肩肉', '铁板烤伊比利亚猪肩肉。'] },
    'Secreto ibérico': {
      ja: ['イベリコ豚のセクレト', 'イベリコ豚の希少部位セクレトの鉄板焼き。'],
      zh: ['伊比利亚猪“秘密肉”', '铁板烤伊比利亚猪“秘密肉”。'] },
    'Lagrimitas de pollo': {
      ja: ['ラグリミータス（鶏肉のフライ）', 'マリネした鶏肉の細切りフライ。'],
      zh: ['炸鸡柳', '腌制鸡肉条油炸。'] },
    'Filete a la plancha': {
      ja: ['フィレの鉄板焼き', '鉄板で焼いたフィレ。'],
      zh: ['铁板肉排', '铁板煎肉排。'] },
    'Hamburguesa de buey': {
      ja: ['牛肉のハンバーガー', '牛肉（ブエイ）のハンバーガー。'],
      zh: ['牛肉汉堡', '牛肉汉堡。'] },
    'Choco frito': {
      ja: ['コウイカのフライ', 'アンダルシア風のコウイカのフライ。'],
      zh: ['炸墨鱼', '安达卢西亚风味炸墨鱼。'] },
    'Cazón en adobo': {
      ja: ['カソン・エン・アドボ', 'マリネしたサメ肉のフライ。'],
      zh: ['腌炸鲨鱼块', '腌制后油炸的鲨鱼肉。'] },
    'Merluza a la romana': {
      ja: ['メルルーサのフリット', '衣をつけて揚げたメルルーサ（タラの仲間）。'],
      zh: ['炸无须鳕', '裹面糊油炸的无须鳕。'] },
    'Cola de toro': {
      ja: ['コラ・デ・トロ（牛テール煮込み）', 'じっくり煮込んだ牛テール。'],
      zh: ['炖牛尾', '慢火炖牛尾。'] },
    'Carrillada': {
      ja: ['豚ほほ肉の煮込み', 'とろとろに煮込んだ豚ほほ肉。'],
      zh: ['炖猪脸颊肉', '软嫩的炖猪脸颊肉。'] },
    'Langostinos con alioli': {
      ja: ['エビのアリオリ', 'パンに、エビとアリオリをのせて。'],
      zh: ['蒜泥蛋黄酱大虾', '面包配大虾和蒜泥蛋黄酱。'] },
    'Filete de pollo o cerdo': {
      ja: ['鶏肉または豚肉のモンタディート', 'パンに、鶏肉または豚肉のフィレをのせて。'],
      zh: ['鸡肉或猪肉小三明治', '面包配鸡排或猪排。'] },
    'Serranito': {
      ja: ['セラニート', 'セビリア名物のサンド：フィレ肉、生ハム、揚げたピーマン。'],
      zh: ['塞维利亚三明治', '塞维利亚特色：肉排、火腿和炸青椒。'] },

    /* ── Postres y bebidas ── */
    'Pie de limón': { ja: ['レモンパイ', ''], zh: ['柠檬派', ''] },
    'Tarta de chocolate': { ja: ['チョコレートケーキ', ''], zh: ['巧克力蛋糕', ''] },
    'Carrot cake': { ja: ['キャロットケーキ', ''], zh: ['胡萝卜蛋糕', ''] },
    'Tarta de queso': { ja: ['チーズケーキ', ''], zh: ['芝士蛋糕', ''] },
    'Cusqueña': { ja: ['クスケーニャ', 'クスコ生まれのペルービール。'], zh: ['库斯科啤酒', '来自库斯科的秘鲁啤酒。'] },
    'Cusqueña Rubia': { ja: ['クスケーニャ・ルビア', 'ラガー。'], zh: ['库斯科金啤', '拉格啤酒。'] },
    'Cusqueña Negra': { ja: ['クスケーニャ・ネグラ', '黒ビール。'], zh: ['库斯科黑啤', '黑啤酒。'] },
    'Pilsen Callao': { ja: ['ピルセン・カヤオ', 'カヤオ生まれのペルービール。'], zh: ['卡亚俄比尔森啤酒', '来自卡亚俄的秘鲁啤酒。'] },
    'Inka Kola personal': { ja: ['インカ・コーラ（小）', '一人用サイズ。'], zh: ['印加可乐（小）', '单人份。'] },
    'Inka Kola mediana': { ja: ['インカ・コーラ（中）', 'ミディアムサイズ。'], zh: ['印加可乐（中）', '中瓶。'] },
    'Inka Kola gordita': { ja: ['インカ・コーラ（大）', 'シェアにぴったりの「ゴルディータ」ボトル。'], zh: ['印加可乐（大）', '适合分享的“胖瓶”。'] },
    'Pisco sour': { ja: ['ピスコサワー', 'ペルーを代表するカクテル。'], zh: ['皮斯科酸酒', '秘鲁国饮鸡尾酒。'] },
    'Sangría': { ja: ['サングリア', 'フルーツ入りの赤ワイン。'], zh: ['西班牙水果酒', '加入水果的红葡萄酒。'] }
  }
};
