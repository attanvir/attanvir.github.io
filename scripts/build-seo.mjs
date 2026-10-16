// Делает страницы, которые видят поисковики, из site/data/books.js:
//   — карточки книг прямо в index.html (раньше каталог рисовал только JavaScript);
//   — отдельную страницу на каждую книгу: books/<id>.html;
//   — разметку schema.org, sitemap.xml и robots.txt.
// Запуск: node scripts/build-seo.mjs. Его же вызывает GitHub Actions перед публикацией.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const BASE = "https://attanvir.github.io/";
const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10);

// books.js — обычный скрипт для браузера, поэтому выполняем его в песочнице и берём window.SITE и window.BOOKS
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(site, "data", "books.js"), "utf8"), sandbox);
const { SITE, BOOKS } = sandbox.window;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Внутри <script type="application/ld+json"> нельзя оставлять «</», иначе текст закроет тег
const jsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
const rub = (n) => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " ₽";
const cover = (b) => (b.images && b.images.length ? b.images[0] : b.image);
const bookUrl = (b) => `${BASE}books/${b.id}.html`;
const waLink = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
// Короткое имя автора для заголовка: всё до «. Разъяснение: …»
const shortAuthor = (b) => b.author.split(". ")[0];

// ---------- Карточки каталога (та же разметка, что строит app.js, но без кнопок и без живых данных) ----------
const catalogCard = (b) => `
        <article class="book" data-id="${esc(b.id)}">
          <div class="book__media"><div class="book__track"><div class="book__slide"><img src="${esc(cover(b))}" alt="Обложка книги «${esc(b.title)}»" width="640" height="800" loading="lazy"></div></div></div>
          <div class="book__body">
            <div class="book__info">
              <h3 class="book__title"><a href="books/${esc(b.id)}.html">${esc(b.title)}</a></h3>
              <p class="book__author">${esc(b.author)}</p>
              ${b.note ? `<p class="book__note">${esc(b.note)}</p>` : ""}
            </div>
            <div class="book__buy"><div class="price">${rub(b.price)}</div></div>
          </div>
        </article>`;

// ---------- Отдельная страница книги ----------
const bookPage = (b) => {
  const photos = b.images && b.images.length ? b.images : [b.image];
  const title = `${b.title} — ${shortAuthor(b)} | Ат-Танвир`;
  const description = `${b.title}. Автор: ${b.author}. Книжный магазин «Ат-Танвир»: ${rub(b.price)}. Доставка Почтой России и Ozon.`;
  const url = bookUrl(b);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: b.title,
    author: { "@type": "Person", name: b.author },
    inLanguage: "ru",
    image: BASE + photos[0],
    url,
    offers: {
      "@type": "Offer",
      price: b.price,
      priceCurrency: "RUB",
      availability: b.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE.name, url: BASE },
    },
  };
  const waText = b.inStock
    ? `Здравствуйте! Хочу заказать книгу «${b.title}» (${b.author}).`
    : `Здравствуйте! Хочу узнать о книге «${b.title}» (${b.author}): когда появится или можно ли заказать.`;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta name="theme-color" content="#26020a">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">
  <meta name="referrer" content="no-referrer">
  <meta property="og:type" content="book">
  <meta property="og:site_name" content="Ат-Танвир">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(BASE + photos[0])}">
  <link rel="icon" type="image/png" href="../img/favicon.png">
  <link rel="apple-touch-icon" href="../img/apple-touch-icon.png">
  <link rel="stylesheet" href="../css/style.css?v=dev">
  <script type="application/ld+json">
${jsonLd(ld)}
  </script>
</head>
<body>

<header class="header">
  <div class="container header__inner">
    <a class="brand" href="../" aria-label="Ат-Танвир — на главную">
      <img class="brand__mark" src="../img/calligraphy.png" alt="" width="52" height="37">
      <span class="brand__name">Ат-Танвир</span>
    </a>
  </div>
</header>

<main class="section">
  <div class="container book-page">
    <div class="book-page__media">
      <img class="book-page__cover" src="../${esc(photos[0])}" alt="Обложка книги «${esc(b.title)}»" width="640" height="800">
      ${photos.slice(1).map((p, i) => `<img class="book-page__photo" src="../${esc(p)}" alt="Фото ${i + 2} книги «${esc(b.title)}»" width="640" height="800" loading="lazy">`).join("\n      ")}
    </div>

    <div class="book-page__text">
      <p class="eyebrow"><a href="../#catalog">← Весь каталог</a></p>
      <h1 class="book-page__title">${esc(b.title)}</h1>
      <p class="book__author">${esc(b.author)}</p>
      ${b.note ? `<p class="book__note">${esc(b.note)}</p>` : ""}
      <p class="price book-page__price">${rub(b.price)}</p>
      ${b.inStock ? "" : `<p class="book__note">Сейчас нет в наличии. Напишите нам, привезём под заказ.</p>`}

      <div class="book-page__actions">
        <a class="btn btn--wa" href="${esc(waLink(waText))}" target="_blank" rel="noopener noreferrer">${b.inStock ? "Заказать в WhatsApp" : "Узнать в WhatsApp"}</a>
        <a class="btn btn--ghost" href="${esc(SITE.telegram)}" target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
      </div>
      <p class="hint">Доставка Почтой России или через Ozon. Стоимость доставки уточним при заказе.</p>
    </div>
  </div>
</main>

<footer class="footer">
  <div class="container footer__bottom">
    <span class="brand brand--footer">
      <img class="brand__mark" src="../img/calligraphy.png" alt="" width="52" height="37">
      <span class="brand__name">Ат-Танвир</span>
    </span>
    <p class="footer__copy">© ${YEAR} Ат-Танвир. Книжный магазин</p>
  </div>
</footer>
</body>
</html>
`;
};

// ---------- Вставка в index.html между метками ----------
const replaceBlock = (html, name, content) => {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1 || b < a) throw new Error(`В index.html нет меток ${name}`);
  // Отступ закрывающей метки берём из её строки, чтобы разметка осталась ровной
  const indent = html.slice(html.lastIndexOf("\n", b) + 1, b);
  return html.slice(0, a + start.length) + "\n" + content + "\n" + indent + html.slice(b);
};

// 1. Каталог в index.html
const indexPath = join(site, "index.html");
let index = readFileSync(indexPath, "utf8");
index = replaceBlock(index, "BOOKS", BOOKS.map(catalogCard).join(""));

// 2. Разметка для всего магазина и списка книг
const indexLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BookStore",
      "@id": BASE + "#store",
      name: SITE.name,
      alternateName: ["Ат Танвир", "Аттанвир"],
      url: BASE,
      inLanguage: "ru",
      description: "Книжный магазин исламской литературы: книги по акыде, хадисам и основам веры.",
      sameAs: [SITE.telegram],
    },
    {
      "@type": "ItemList",
      name: "Каталог книг «Ат-Танвир»",
      itemListElement: BOOKS.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.title, url: bookUrl(b) })),
    },
  ],
};
index = replaceBlock(index, "SEO", `  <script type="application/ld+json">\n${jsonLd(indexLd)}\n  </script>`);
writeFileSync(indexPath, index);

// 3. Отдельная страница на каждую книгу; страницы удалённых книг убираем
const booksDir = join(site, "books");
mkdirSync(booksDir, { recursive: true });
const ids = new Set(BOOKS.map((b) => b.id));
for (const file of readdirSync(booksDir)) {
  if (file.endsWith(".html") && !ids.has(file.slice(0, -5))) unlinkSync(join(booksDir, file));
}
for (const b of BOOKS) writeFileSync(join(booksDir, `${b.id}.html`), bookPage(b));

// 4. sitemap.xml и robots.txt
const urls = [BASE, ...BOOKS.map(bookUrl)];
writeFileSync(
  join(site, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`
);
writeFileSync(join(site, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);

console.log(`Готово: ${BOOKS.length} книг, страниц в sitemap: ${urls.length}`);
