(function () {
  "use strict";

  var SITE = window.SITE;
  var BOOKS = window.BOOKS;
  var REVIEWS = window.REVIEWS || [];
  var STORAGE_KEY = "attanvir_cart_v1";
  var MAX_QTY = 99;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var rub = function (n) { return n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽"; };
  var byId = {};
  BOOKS.forEach(function (b) { byId[b.id] = b; });

  /* ---------- Состояние корзины ---------- */
  var cart = loadCart();

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      var clean = {};
      Object.keys(raw).forEach(function (id) {
        var q = Math.floor(Number(raw[id]));
        if (byId[id] && byId[id].inStock && q > 0) clean[id] = Math.min(q, MAX_QTY);
      });
      return clean;
    } catch (e) {
      return {};
    }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* без хранилища работаем в памяти */ }
  }
  function setQty(id, q) {
    q = Math.max(0, Math.min(MAX_QTY, q));
    if (q === 0) delete cart[id]; else cart[id] = q;
    saveCart();
    render();
  }
  function totalCount() {
    return Object.keys(cart).reduce(function (s, id) { return s + cart[id]; }, 0);
  }
  function totalSum() {
    return Object.keys(cart).reduce(function (s, id) { return s + cart[id] * byId[id].price; }, 0);
  }

  /* ---------- Вспомогательные построители ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function qtyControl(id, cls) {
    var box = el("div", "qty " + cls);
    var minus = el("button", "qty__btn", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", "Уменьшить количество: " + byId[id].title);
    minus.dataset.act = "dec"; minus.dataset.id = id;
    var num = el("span", "qty__num", String(cart[id] || 0));
    num.setAttribute("aria-live", "polite");
    var plus = el("button", "qty__btn", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", "Увеличить количество: " + byId[id].title);
    plus.dataset.act = "inc"; plus.dataset.id = id;
    box.append(minus, num, plus);
    return box;
  }
  var CART_PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M3 4h2.4l2.1 11h9.6l2-8H6.2M9 20a1 1 0 1 0 0 .01M17 20a1 1 0 1 0 0 .01M12.8 9v4M10.8 11h4"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 6l6 6-6 6"/></svg>';
  var ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.4Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M21.9 4.2 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6.1 13.5 1.2 12c-1.1-.3-1.1-1 .2-1.6L20.5 3c.9-.3 1.7.2 1.4 1.2Z"/></svg>'
  };

  /* ---------- Каталог ---------- */
  function buildCatalog() {
    var grid = $("#catalogGrid");
    grid.textContent = "";   // карточки из HTML (для поисковиков) заменяем живыми, с кнопками и листанием фото
    BOOKS.forEach(function (b) {
      var card = el("article", "book reveal");
      card.dataset.id = b.id;

      var body = el("div", "book__body");
      var info = el("div", "book__info");   // текст отдельно: под ним отступ, ниже линия и строка с ценой
      var title = el("h3", "book__title");
      var link = el("a", null, b.title);   // название ведёт на отдельную страницу книги
      link.href = "books/" + b.id + ".html";
      link.title = b.title;   // название обрезается до двух строк, полностью видно во всплывающей подсказке
      title.append(link);
      var author = el("p", "book__author", b.author);
      author.title = b.author;
      info.append(title, author);
      if (b.note) info.append(el("p", "book__note", b.note));

      var buy = el("div", "book__buy");
      buy.append(el("div", "price", rub(b.price)), el("div", "book__slot"));
      body.append(info, buy);

      card.append(bookMedia(b), body);
      grid.append(card);
    });
  }

  // Фото книги без надписей поверх. Если фото несколько: лента со свайпом, стрелки и точки внизу
  function bookMedia(b) {
    var photos = b.images && b.images.length ? b.images : [b.image];
    var media = el("div", "book__media");
    var track = el("div", "book__track");
    photos.forEach(function (src, i) {
      var slide = el("div", "book__slide");
      var img = document.createElement("img");
      img.src = src; img.loading = "lazy"; img.width = 640; img.height = 800;
      img.alt = i === 0 ? "Обложка книги «" + b.title + "»" : "Фото " + (i + 1) + " книги «" + b.title + "»";
      slide.append(img);
      track.append(slide);
    });
    media.append(track);

    if (photos.length > 1) {
      track.setAttribute("aria-label", "Фото книги «" + b.title + "»");
      track.tabIndex = 0;   // ленту можно листать стрелками клавиатуры
      var prev = el("button", "book__nav book__nav--prev");
      var next = el("button", "book__nav book__nav--next");
      prev.type = next.type = "button";
      prev.innerHTML = ARROW.replace("M10 6l6 6-6 6", "M14 6l-6 6 6 6");
      next.innerHTML = ARROW;
      prev.setAttribute("aria-label", "Предыдущее фото");
      next.setAttribute("aria-label", "Следующее фото");
      var dots = el("div", "book__dots");
      dots.setAttribute("aria-hidden", "true");
      photos.forEach(function () { dots.append(el("span", "book__dot")); });

      var mark = function (i) {
        Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle("is-active", k === i); });
        prev.disabled = i === 0;
        next.disabled = i === photos.length - 1;
      };
      var current = function () { return Math.round(track.scrollLeft / (track.clientWidth || 1)); };
      // Стрелки отмечают точку сразу и не дают плавной прокрутке перебивать её по дороге; свайп — по ходу прокрутки
      var target = null;
      var go = function (step) {
        var i = Math.max(0, Math.min(photos.length - 1, (target != null ? target : current()) + step));
        target = i;
        track.scrollTo({ left: i * track.clientWidth });
        mark(i);
      };
      prev.addEventListener("click", function () { go(-1); });
      next.addEventListener("click", function () { go(1); });
      track.addEventListener("scroll", function () {
        if (target != null) { if (current() === target) target = null; return; }
        mark(current());
      }, { passive: true });
      track.addEventListener("pointerdown", function () { target = null; });   // свайп отменяет переход по стрелке
      mark(0);
      media.append(prev, next, dots);
    }
    return media;
  }

  function renderCatalog() {
    BOOKS.forEach(function (b) {
      var slot = $('.book[data-id="' + b.id + '"] .book__slot');
      var had = slot.contains(document.activeElement) ? document.activeElement.dataset.act : null;
      slot.textContent = "";
      if (!b.inStock) {
        var off = el("button", "add-btn", "Нет в наличии");
        off.disabled = true;
        slot.append(off);
      } else if (cart[b.id]) {
        slot.append(qtyControl(b.id, "qty--card"));
        if (had) { var again = slot.querySelector('[data-act="' + had + '"]'); if (again) again.focus(); }
      } else {
        var add = el("button", "add-btn");
        add.innerHTML = '<span>В корзину</span><span class="add-btn__icon">' + CART_PLUS + "</span>";
        add.type = "button"; add.dataset.act = "add"; add.dataset.id = b.id;
        add.setAttribute("aria-label", "Добавить в корзину: " + b.title);
        slot.append(add);
        if (had === "dec") add.focus();
      }
    });
  }

  /* ---------- Корзина ---------- */
  function renderCart() {
    var ids = Object.keys(cart);
    var list = $("#cartList");
    list.textContent = "";
    ids.forEach(function (id) {
      var b = byId[id];
      var li = el("li", "cart-item");
      var img = document.createElement("img");
      img.src = b.image; img.alt = ""; img.width = 64; img.height = 86;
      var info = el("div");
      info.append(el("p", "cart-item__title", b.title));
      var row = el("div", "cart-item__row");
      row.append(qtyControl(id, "qty--cart"), el("span", "cart-item__sum", rub(b.price * cart[id])));
      var rm = el("button", "remove", "Удалить");
      rm.type = "button"; rm.dataset.act = "del"; rm.dataset.id = id;
      rm.setAttribute("aria-label", "Удалить из корзины: " + b.title);
      info.append(row, rm);
      li.append(img, info);
      list.append(li);
    });
    $("#cartEmpty").hidden = ids.length > 0;
    $("#orderForm").hidden = ids.length === 0;
    $("#cartTotal").textContent = rub(totalSum());
  }

  function renderBadge() {
    var n = totalCount();
    var badge = $("#cartCount");
    badge.textContent = String(n);
    $("#openCart").setAttribute("aria-label", "Открыть корзину, книг: " + n);
  }

  function render() {
    renderCatalog();
    renderCart();
    renderBadge();
  }

  /* ---------- Отзывы и контакты ---------- */
  function buildReviews() {
    var box = $("#reviewsList");
    REVIEWS.forEach(function (r) {
      // Обёртка .review даёт отступ до следующего отзыва, карточка внутри: цитата и подпись, только если указано имя
      var item = el("div", "review reveal");
      var card = el("figure", "review__card");
      card.append(el("blockquote", "review__text", r.text));
      if (r.name) card.append(el("figcaption", "review__author", r.name));
      item.append(card);
      box.append(item);
    });
  }

  // Кнопка «Следите за новыми поступлениями» под каталогом
  function buildFollow() {
    $("#followTelegram").href = SITE.telegram;
  }

  function buildContacts() {
    var box = $("#contactsList");
    var items = [
      { key: "whatsapp", title: "WhatsApp", sub: "Написать напрямую", href: waLink("Ассаламу алейкум! У меня вопрос по книгам.") },
      { key: "telegram", title: "Канал в Telegram", sub: "Новинки и поступления", href: SITE.telegram }
    ];
    items.forEach(function (it) {
      var a = el("a", "contact");
      a.href = it.href; a.target = "_blank"; a.rel = "noopener noreferrer";
      var icon = el("span", "contact__icon");
      icon.innerHTML = ICONS[it.key];
      var txt = el("span", "contact__text");
      txt.append(el("span", "contact__title", it.title), el("span", "contact__sub", it.sub));
      var go = el("span", "contact__go"); go.innerHTML = ARROW;   // стрелка справа, как у кнопок сайта
      a.append(icon, txt, go);
      box.append(a);
    });
  }

  // Кнопки блока «Под заказ»: заявка на книгу, которой нет в наличии
  function buildCustomOrder() {
    var box = $("#customActions");
    var msg = "Ассаламу алейкум! Хочу заказать книгу, которой нет в наличии: ";
    // Главное действие: кнопка WhatsApp. Telegram: контурная кнопка рядом, как в форме заказа
    var wa = el("a", "btn btn--gold");
    wa.href = waLink(msg); wa.target = "_blank"; wa.rel = "noopener noreferrer";
    var ic = el("span", "btn__icon"); ic.innerHTML = ICONS.whatsapp;
    ic.firstChild.setAttribute("width", "20"); ic.firstChild.setAttribute("height", "20");
    wa.append(ic, "Написать в WhatsApp");

    var tg = el("a", "btn btn--ghost");
    tg.href = SITE.telegramChat || SITE.telegram; tg.target = "_blank"; tg.rel = "noopener noreferrer";
    var tic = el("span", "btn__icon"); tic.innerHTML = ICONS.telegram;
    tic.firstChild.setAttribute("width", "20"); tic.firstChild.setAttribute("height", "20");
    tg.append(tic, "Написать в Telegram");

    box.append(wa, tg);
  }

  /* ---------- Drawer ---------- */
  var drawer = $("#drawer"), overlay = $("#overlay"), lastFocus = null;

  function openCart() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add("is-open"); });
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    drawer.focus();
  }
  function closeCart() {
    overlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    setTimeout(function () { overlay.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function isOpen() { return drawer.classList.contains("is-open"); }

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") { closeCart(); return; }
    if (e.key !== "Tab") return;
    var f = drawer.querySelectorAll('button, input, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    f = Array.prototype.filter.call(f, function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === drawer)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- Действия ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var id = t.dataset.id, act = t.dataset.act;
    if (act === "add") { setQty(id, 1); bump(); }
    else if (act === "inc") { setQty(id, (cart[id] || 0) + 1); }
    else if (act === "dec") { setQty(id, (cart[id] || 0) - 1); }
    else if (act === "del") { setQty(id, 0); }
  });
  function bump() {
    var b = $("#openCart");
    b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  }
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);

  /* ---------- Форма и WhatsApp ---------- */
  var form = $("#orderForm");

  function syncDeliveryLabel() {
    var d = form.elements.delivery.value;
    $("#addressLabel").textContent = d === "Ozon" ? "Пункт выдачи Ozon (адрес или код)" : "Адрес и индекс или отделение Почты России";
  }
  form.addEventListener("change", function (e) { if (e.target.name === "delivery") syncDeliveryLabel(); });
  syncDeliveryLabel();

  function waLink(text) {
    return "https://wa.me/" + SITE.whatsapp + "?text=" + encodeURIComponent(text);
  }
  function waConfigured() {
    return /^\d{11,15}$/.test(SITE.whatsapp) && !/^70{7,}/.test(SITE.whatsapp);
  }

  function setErr(name, msg) {
    var span = form.querySelector('[data-err="' + name + '"]');
    var input = form.elements[name];
    if (span) span.textContent = msg || "";
    if (input) { input.classList.toggle("invalid", !!msg); if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); }
  }
  function validate() {
    var v = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      city: form.elements.city.value.trim(),
      address: form.elements.address.value.trim()
    };
    var digits = v.phone.replace(/\D/g, "");
    var errs = {};
    if (v.name.length < 2) errs.name = "Укажите имя";
    if (digits.length < 10 || digits.length > 15 || !/^[\d\s()+\-.]+$/.test(v.phone)) errs.phone = "Укажите телефон, например +7 900 000-00-00";
    if (v.city.length < 2) errs.city = "Укажите город";
    if (v.address.length < 3) errs.address = "Укажите адрес или пункт выдачи";
    ["name", "phone", "city", "address"].forEach(function (k) { setErr(k, errs[k]); });
    var first = Object.keys(errs)[0];
    if (first) form.elements[first].focus();
    return !first;
  }

  function buildMessage() {
    var lines = ["Ассаламу алейкум! Хочу заказать:", ""];
    Object.keys(cart).forEach(function (id, i) {
      var b = byId[id];
      lines.push((i + 1) + ". " + b.title + " × " + cart[id] + " — " + rub(b.price * cart[id]));
    });
    lines.push("", "Итого за книги: " + rub(totalSum()), "",
      "Имя: " + form.elements.name.value.trim(),
      "Телефон: " + form.elements.phone.value.trim(),
      "Доставка: " + form.elements.delivery.value,
      "Город: " + form.elements.city.value.trim(),
      "Адрес / пункт выдачи: " + form.elements.address.value.trim());
    var c = form.elements.comment.value.trim();
    if (c) lines.push("Комментарий: " + c);
    return lines.join("\n");
  }

  // Копируем текст заказа сразу, через выделение: асинхронный буфер обмена может не успеть до того,
  // как откроется вкладка с чатом и страница потеряет фокус
  function copyText(text, back) {
    var ta = el("textarea");
    ta.value = text; ta.readOnly = true;
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
    drawer.append(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { /* ниже пробуем буфер обмена браузера */ }
    ta.remove();
    if (back) back.focus();   // фокус остаётся в корзине, на нажатой кнопке
    if (!ok && navigator.clipboard) { navigator.clipboard.writeText(text).catch(function () {}); ok = true; }
    return ok;
  }

  // window.open с "noopener" всегда возвращает null, поэтому отвязываем вкладку сами.
  // Ссылка открывается в этой же вкладке, только если браузер не дал открыть новую
  function openChat(url) {
    var w = window.open(url, "_blank");
    if (w) w.opener = null; else window.location.href = url;
  }

  // Telegram подставляет текст из ?text= в личный чат или группу, но не всегда: на этот случай заказ ещё и копируется
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#formStatus");
    var via = (e.submitter && e.submitter.dataset.via) || "whatsapp";
    status.textContent = "";
    status.classList.remove("is-ok");
    if (!totalCount()) { status.textContent = "Корзина пуста"; return; }
    if (!validate()) return;
    var text = buildMessage();
    if (via === "whatsapp") {
      if (!waConfigured()) { status.textContent = "Номер WhatsApp магазина ещё не указан. Отправьте заказ в Telegram."; return; }
      openChat(waLink(text));
      return;
    }
    var copied = copyText(text, e.submitter);
    openChat((SITE.telegramChat || SITE.telegram) + "?text=" + encodeURIComponent(text));
    status.classList.add("is-ok");
    status.textContent = copied
      ? "Текст заказа скопирован. Если в Telegram он не появился сам, вставьте его в сообщение и отправьте."
      : "Не получилось скопировать текст заказа. Напишите в Telegram книги, имя, телефон, город и адрес.";
  });
  ["name", "phone", "city", "address"].forEach(function (k) {
    form.elements[k].addEventListener("input", function () { setErr(k, ""); });
  });

  /* ---------- Движение ---------- */
  // Спокойное появление: элементы .reveal один раз проявляются, когда входят в экран. Здесь только
  // наблюдение (IntersectionObserver), сама анимация в style.css, раздел «Появление при прокрутке».
  // Вошедшие в экран вместе получают задержку с шагом 0.08с и идут каскадом.
  // На десктопе фото библиотеки и свечение первого экрана отстают от прокрутки на 18% (параллакс).
  // Секции складываются стопкой листов: следующий наезжает на предыдущий, тот уменьшается и темнеет (initStack).
  // Прокрутку не перехватываем. При «уменьшить движение» в системе всё видно сразу и ничего не двигается.
  var header = $(".header");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAGGER = 0.08, MAX_DELAY = 0.48, PARALLAX = 0.18;

  function initHeader() {
    function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Меню на телефоне и планшете: кнопка открывает список разделов под шапкой. Закрывается при выборе
  // раздела, нажатии мимо меню, клавише Esc и когда окно становится шире 900px (там разделы видны в шапке)
  function initMenu() {
    var btn = $("#menuBtn");
    function setMenu(open, refocus) {
      header.classList.toggle("is-menu-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      if (!open && refocus) btn.focus();
    }
    function isMenuOpen() { return header.classList.contains("is-menu-open"); }
    btn.addEventListener("click", function () { setMenu(!isMenuOpen()); });
    document.addEventListener("click", function (e) {
      if (!isMenuOpen()) return;
      if (e.target.closest("#siteNav a") || !header.contains(e.target)) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isMenuOpen()) setMenu(false, true);
    });
    var wide = window.matchMedia("(min-width: 900px)");
    var onWide = function () { if (wide.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide); else wide.addListener(onWide);
    // Корзина открывается поверх: меню под ней не нужно
    $("#openCart").addEventListener("click", function () { setMenu(false); });
  }

  function initReveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var shown = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      // Каскад идёт в порядке страницы: слева направо и сверху вниз
      shown.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      shown.forEach(function (n, i) {
        n.style.setProperty("--delay", Math.min(i * STAGGER, MAX_DELAY).toFixed(2) + "s");
        n.classList.add("is-visible");
        io.unobserve(n);
      });
    }, { rootMargin: "0px 0px -8% 0px" });   // срабатывает, когда элемент чуть поднялся над нижним краем экрана
    nodes.forEach(function (n) { io.observe(n); });
  }

  // Как попасть в раздел. По умолчанию плавная прокрутка; initTransitions подменяет её переходом со слоем
  var navigate = function (y) { window.scrollTo({ top: y, behavior: "smooth" }); };

  function initParallax() {
    var hero = $(".hero"), wide = window.matchMedia("(min-width: 900px)");
    var heroH = 1, last = "", queued = false;

    function frame() {
      queued = false;
      // Ниже первого экрана сдвиг уже не виден, дальше его не пересчитываем
      var v = wide.matches ? (Math.min(window.scrollY, heroH) * PARALLAX).toFixed(1) + "px" : "0px";
      if (v !== last) { hero.style.setProperty("--parallax", v); last = v; }
    }
    function measure() { heroH = hero.offsetHeight || 1; frame(); }

    window.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(frame);
    }, { passive: true });
    window.addEventListener("resize", measure);
    measure();
  }

  // Стопка листов (style.css, «Листы при прокрутке»): прямые дети .stack, то есть секции и группы секций.
  // Лист останавливается (sticky): высокий, когда его низ дошёл до низа экрана, короткий сразу под шапкой.
  // Пока следующий лист поднимается от этого места до шапки, --cover растёт от 0 до 1.
  // Позиции считаем по обычному потоку один раз (и при смене размеров),
  // поэтому в кадре прокрутки раскладку не читаем.
  function initStack() {
    var stack = $(".stack");
    var items = Array.prototype.slice.call(stack.children);
    var tops = [], sticks = [], starts = [], covers = [], headH = 0, queued = false;

    function frame() {
      queued = false;
      var y = window.scrollY;
      for (var i = 1; i < items.length - 1; i++) {   // первый экран не уменьшается: второй лист просто наезжает на него
        var at = tops[i + 1] - y;   // где сейчас на экране верх следующей секции
        var c = Math.min(Math.max((starts[i] - at) / Math.max(starts[i] - headH, 1), 0), 1).toFixed(3);
        if (c !== covers[i]) { items[i].style.setProperty("--cover", c); covers[i] = c; }
      }
    }
    function measure() {
      var vh = document.documentElement.clientHeight;   // без адресной строки телефона, поэтому не прыгает
      var y = stack.getBoundingClientRect().top + window.scrollY;
      headH = header.offsetHeight;
      items.forEach(function (s, i) {
        var h = s.offsetHeight;
        y += parseFloat(getComputedStyle(s).marginTop) || 0;   // лист заходит на предыдущую секцию
        tops[i] = y;
        y += h;
        sticks[i] = Math.min(headH, vh - h);
        if (i > 0) s.style.top = sticks[i] + "px";
        // Видимая часть остановившегося листа: от точки у шапки до его низа. К этой точке лист уменьшается,
        // по этой части идёт затемнение с размытием
        var seen = Math.max(0, h - (vh - headH));
        s.style.setProperty("--seen", seen + "px");
        s.style.setProperty("--seen-h", h - seen + "px");
      });
      // Где на экране верх следующей секции в момент, когда эта остановилась: отсюда начинается накрытие
      for (var i = 0; i < items.length - 1; i++) starts[i] = tops[i + 1] - tops[i] + sticks[i];
      frame();
    }

    // Браузер ведёт ссылку к секции туда, где она сейчас остановилась, а не к её месту в потоке.
    // Поэтому переходы по ссылкам на разделы считаем сами. Секция бывает листом или лежит в группе
    // (тогда offsetTop отсчитан от группы: она sticky, то есть позиционирована). Нижняя секция группы
    // не поднимется к шапке: группа остановится раньше. Тогда едем до остановки, пока следующий лист не наехал
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      var target = a && document.getElementById(a.getAttribute("href").slice(1));
      var i = -1;
      items.forEach(function (s, k) { if (target && s.contains(target)) i = k; });
      if (!target || (i < 0 && target !== header)) return;
      e.preventDefault();
      var y = i < 0 ? 0 : tops[i] + (target === items[i] ? 0 : target.offsetTop) - headH;
      if (i >= 0 && i < items.length - 1) y = Math.min(y, tops[i] - sticks[i]);
      navigate(Math.max(y, 0), target, e);
      history.pushState(null, "", a.getAttribute("href"));
    });

    stack.classList.add("is-stacked");
    window.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(frame);
    }, { passive: true });
    window.addEventListener("resize", measure);
    // Высота секций меняется после загрузки шрифтов и фото: тогда пересчитываем
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(measure);
      items.forEach(function (s) { ro.observe(s); });
    }
    measure();
  }

  // Переходы между разделами (style.css, «Переходы между разделами»). Слой закрывает экран, страница под ним
  // перескакивает на нужное место, слой уходит. Приём выбирается по месту назначения:
  // «О нас», «Под заказ», «Отзывы»: лист с названием; контакты и «наверх»: дыхание. Каталог без слоя: плавная прокрутка.
  // Слой пускаем по ссылке из меню и кнопкам-ссылкам. Без поддержки масок или @property остаётся плавная прокрутка
  function initTransitions() {
    var ok = window.CSS && CSS.supports && "animate" in Element.prototype && "registerProperty" in CSS &&
      (CSS.supports("mask-composite", "exclude") || CSS.supports("-webkit-mask-composite", "xor"));
    if (!ok) return;

    var IN_OUT = "cubic-bezier(.7, 0, .2, 1)", OUT = "cubic-bezier(.22, 1, .36, 1)";   // OUT: то же торможение, что у появления при прокрутке

    var root = el("div", "vt"), shape = el("div", "vt__shape"), title = el("div", "vt__title");
    var word = el("span", "vt__word"), orn = el("img", "vt__orn");
    orn.src = "img/divider.png"; orn.alt = ""; orn.width = 2040; orn.height = 180;
    title.append(word, orn);
    root.append(shape, title);
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
    // Пока слой на экране, страницу под ним не листаем: место назначения уже посчитано
    ["wheel", "touchmove"].forEach(function (t) { root.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false }); });

    var busy = false;
    var play = function (node, frames, ms, ease, delay) {
      return node.animate(frames, { duration: ms, easing: ease || OUT, delay: delay || 0, fill: "both" }).finished;
    };
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var sweep = function (from, to, ms, ease) {
      return play(word, [{ backgroundPosition: from + "% 0" }, { backgroundPosition: to + "% 0" }], ms, ease);
    };
    var fade = function (from, to, ms, delay) { return play(orn, [{ opacity: from }, { opacity: to }], ms, OUT, delay); };
    function jump(y) {
      // В CSS у страницы плавная прокрутка, а тут нужен мгновенный прыжок под слоем
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    }
    function origin(x, y) { root.style.setProperty("--ox", x + "px"); root.style.setProperty("--oy", y + "px"); }

    function sheet(y) {
      return play(shape, [{ transform: "translateY(105%)" }, { transform: "translateY(0)" }], 400, IN_OUT).then(function () {
        jump(y);
        title.hidden = false;
        return Promise.all([sweep(100, 50, 260, OUT), fade(0, 1, 260, 60)]);
      }).then(function () { return wait(50); }).then(function () {
        return Promise.all([
          play(shape, [{ transform: "translateY(0)" }, { transform: "translateY(-105%)" }], 500, IN_OUT),
          play(title, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-26vh)", opacity: 0 }], 470, IN_OUT),
          sweep(50, 0, 300, IN_OUT)
        ]);
      });
    }

    function breath(o, y, arrive) {
      var blur = function (px) { return { backdropFilter: "blur(" + px + "px)", webkitBackdropFilter: "blur(" + px + "px)" }; };
      origin(o.x, o.y);
      return play(shape, [Object.assign({ opacity: 0 }, blur(0)), Object.assign({ opacity: 1 }, blur(16))], 320, OUT).then(function () {
        jump(y);
        var back = [play(shape, [Object.assign({ opacity: 1 }, blur(16)), Object.assign({ opacity: 0 }, blur(0))], 760, OUT, 60)];
        // Раздел проступает из размытия: чуть ниже своего места и чуть крупнее
        if (arrive) back.push(play(arrive, [{ opacity: 0, filter: "blur(10px)", transform: "translateY(26px) scale(1.02)" }, { opacity: 1, filter: "blur(0px)", transform: "translateY(0) scale(1)" }], 900, OUT, 60));
        return Promise.all(back);
      });
    }

    function run(y, target, e) {
      var id = target.id, hero = target === header || id === "top";
      var mode = (hero || id === "contacts") ? "breath" : "sheet";
      var surface = target.closest(".section, .hero");
      var tone = surface && surface.classList.contains("section--alt") ? "parch" : "wine";
      var heading = target.querySelector(".section__title");
      var arrive = hero ? $(".hero__inner") : target.querySelector(".container");
      // Точка нажатия; с клавиатуры (координат нет) центр самой ссылки
      var r = e.target.closest("a").getBoundingClientRect();
      var o = !e.clientX && !e.clientY ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: e.clientX, y: e.clientY };

      busy = true;
      word.textContent = heading ? heading.textContent : "";
      root.className = "vt vt--" + mode + (tone === "wine" ? "" : " vt--" + tone);
      title.hidden = mode === "breath";
      orn.hidden = false;
      root.hidden = false;
      var go = mode === "sheet" ? sheet(y) : breath(o, y, arrive);
      var done = function () {
        [root, shape, title, word, orn, arrive].forEach(function (n) { if (n) n.getAnimations().forEach(function (a) { a.cancel(); }); });
        root.hidden = true;
        root.className = "vt";
        busy = false;
      };
      go.then(done, done);
    }

    navigate = function (y, target, e) {
      if (busy) return;
      // Каталог без заставки: обычная плавная прокрутка. Раздел уже перед глазами: тоже достаточно плавно подъехать
      if (target.id === "catalog" || Math.abs(y - window.scrollY) < 80) { window.scrollTo({ top: y, behavior: "smooth" }); return; }
      run(y, target, e);
    };
  }

  /* ---------- Старт ---------- */
  $("#year").textContent = new Date().getFullYear();
  buildCatalog();
  buildReviews();
  buildFollow();
  buildContacts();
  buildCustomOrder();
  render();
  initHeader();
  initMenu();
  initReveal();
  if (!reduceMotion) { initParallax(); initStack(); initTransitions(); }
})();
