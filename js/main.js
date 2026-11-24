/*
 * Mayadere Fırın & Kahve: tanıtım sitesi demosu
 * Bağımlılık yok. Bu dosya beş küçük işi yapar:
 *   1. Mobil menüyü açıp kapatır.
 *   2. Kaydırırken menüde bulunulan bölümü işaretler.
 *   3. Çalışma saatlerine göre "Şu an açık / kapalı" bilgisini gösterir.
 *   4. Demo bağlantılarında (tel:, wa.me, harita) yönlendirmek yerine bilgi baloncuğu açar.
 *   5. İletişim formunu doğrular; hiçbir yere veri göndermez.
 */
(function () {
  'use strict';

  /* 1. Mobil menü ------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function isMenuOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () {
    setMenu(!isMenuOpen());
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isMenuOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (isMenuOpen() && !event.target.closest('.site-header')) setMenu(false);
  });

  var desktopQuery = window.matchMedia('(min-width: 60em)');
  function onDesktopChange(event) {
    if (event.matches) setMenu(false);
  }
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onDesktopChange);

  /* 2. Etkin bölüm vurgusu ---------------------------------------------- */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));

  function setActiveSection(id) {
    navLinks.forEach(function (link) {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    // Ekranın ortasındaki ince bir şeridi kesen bölüm "etkin" sayılır.
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -54% 0px' });

    document.querySelectorAll('main > section[id]').forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* 3. Çalışma saatleri ------------------------------------------------- */
  // Saatler tek yerde, HTML'deki tabloda durur (data-day / data-hours).
  var DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var schedule = Array.prototype.map.call(document.querySelectorAll('.hours tr[data-day]'), function (row) {
    var hours = (row.getAttribute('data-hours') || '').split('-');
    return {
      row: row,
      day: Number(row.getAttribute('data-day')),
      name: row.querySelector('th').textContent.trim(),
      open: hours[0] || '',
      close: hours[1] || ''
    };
  });
  var statusElements = document.querySelectorAll('[data-open-status]');

  function toMinutes(hhmm) {
    var parts = hhmm.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  // Ziyaretçinin saat dilimi ne olursa olsun Türkiye saati esas alınır.
  function nowInTurkey() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    var get = function (type) {
      return parts.filter(function (p) { return p.type === type; })[0].value;
    };
    return {
      day: DAY_KEYS.indexOf(get('weekday')),
      minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute'))
    };
  }

  function findDay(day) {
    return schedule.filter(function (entry) { return entry.day === day; })[0];
  }

  function updateOpeningStatus() {
    if (!schedule.length) return;
    var now;
    try {
      now = nowInTurkey();
    } catch (error) {
      return; // Eski tarayıcı: durum rozeti gizli kalır, tablo yine okunur.
    }

    var today = findDay(now.day);
    schedule.forEach(function (entry) {
      var isToday = entry === today;
      var badge = entry.row.querySelector('.today-badge');
      entry.row.classList.toggle('is-today', isToday);
      if (isToday) {
        entry.row.setAttribute('aria-current', 'date');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'today-badge';
          badge.textContent = 'Bugün';
          entry.row.querySelector('th').appendChild(badge);
        }
      } else {
        entry.row.removeAttribute('aria-current');
        if (badge) badge.remove();
      }
    });

    var isOpen = Boolean(today && today.open &&
      now.minutes >= toMinutes(today.open) && now.minutes < toMinutes(today.close));
    var headline = isOpen ? 'Şu an açık' : 'Şu an kapalı';
    var detail = '';

    if (isOpen) {
      detail = 'kapanış ' + today.close;
    } else {
      for (var offset = 0; offset < 8; offset++) {
        var entry = findDay((now.day + offset) % 7);
        if (!entry || !entry.open) continue;
        if (offset === 0 && now.minutes >= toMinutes(entry.open)) continue;
        var when = offset === 0 ? 'bugün' : offset === 1 ? 'yarın' : entry.name.toLocaleLowerCase('tr');
        detail = 'açılış ' + when + ' ' + entry.open;
        break;
      }
    }

    statusElements.forEach(function (el) {
      var strong = document.createElement('strong');
      strong.textContent = headline;
      el.replaceChildren(strong, document.createTextNode(detail ? ' · ' + detail : ''));
      el.classList.toggle('is-open', isOpen);
      el.hidden = false;
    });
  }

  updateOpeningStatus();
  setInterval(updateOpeningStatus, 60 * 1000);

  /* 4. Demo bilgi baloncuğu --------------------------------------------- */
  // data-demo özniteliği olan bağlantılar (tel:, wa.me, harita) bu demoda
  // gerçekten yönlendirmez; bunun yerine ne yapacaklarını anlatır.
  var bubble = document.querySelector('.demo-bubble');
  var announcer = document.getElementById('duyuru');
  var bubbleTimer = 0;
  var bubbleTrigger = null;

  function hideBubble() {
    if (bubble.hidden) return;
    clearTimeout(bubbleTimer);
    bubble.classList.remove('is-visible');
    bubbleTrigger = null;
    bubbleTimer = setTimeout(function () { bubble.hidden = true; }, 200);
  }

  function showBubble(trigger) {
    var text = trigger.getAttribute('data-demo');
    var label = document.createElement('strong');
    label.textContent = 'Demo:';
    bubble.replaceChildren(label, document.createTextNode(' ' + text));

    clearTimeout(bubbleTimer);
    bubble.classList.remove('is-visible', 'is-below');
    bubble.style.left = '0px';
    bubble.style.top = '0px';
    bubble.hidden = false;

    var gap = 12;
    var edge = 8;
    var target = trigger.getBoundingClientRect();
    var size = bubble.getBoundingClientRect();
    var top = target.top - size.height - gap;
    var below = top < edge;
    if (below) top = target.bottom + gap;
    var left = target.left + target.width / 2 - size.width / 2;
    left = Math.max(edge, Math.min(left, window.innerWidth - size.width - edge));
    var arrow = Math.max(16, Math.min(target.left + target.width / 2 - left, size.width - 16));

    bubble.style.top = Math.round(top) + 'px';
    bubble.style.left = Math.round(left) + 'px';
    bubble.style.setProperty('--arrow-x', Math.round(arrow) + 'px');
    bubble.classList.toggle('is-below', below);
    requestAnimationFrame(function () { bubble.classList.add('is-visible'); });

    // Ekran okuyucular için aynı metni canlı bölgeye yaz.
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = 'Demo: ' + text; }, 60);

    bubbleTrigger = trigger;
    bubbleTimer = setTimeout(hideBubble, 5000);
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-demo]');
    if (trigger) {
      event.preventDefault();
      showBubble(trigger);
    } else {
      hideBubble();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') hideBubble();
  });

  window.addEventListener('scroll', function () {
    // Sabit düğmelerin baloncuğu kaydırınca yerinde kalabilir; diğerleri kapanır.
    if (bubbleTrigger && !bubbleTrigger.closest('.quick-actions')) hideBubble();
  }, { passive: true });

  window.addEventListener('resize', hideBubble);

  /* 5. İletişim formu --------------------------------------------------- */
  var form = document.getElementById('iletisim-formu');
  if (!form) return;

  var submitButton = form.querySelector('button[type="submit"]');
  var formStatus = document.getElementById('form-durum');
  var messageField = document.getElementById('f-mesaj');
  var counter = document.getElementById('f-mesaj-sayac');
  var maxLength = Number(messageField.getAttribute('maxlength'));
  var triedSubmit = false;

  submitButton.disabled = false;

  var rules = {
    ad: function (value) {
      if (!value) return 'Lütfen adınızı ve soyadınızı yazın.';
      if (value.length < 2) return 'Ad en az 2 karakter olmalı.';
      return '';
    },
    eposta: function (value) {
      if (!value) return 'Lütfen e-posta adresinizi yazın.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Geçerli bir e-posta adresi yazın (ör. ad@alanadi.com).';
      return '';
    },
    telefon: function (value) {
      if (!value) return '';
      var digits = value.replace(/\D/g, '');
      if (!/^[\d\s()+-]+$/.test(value) || digits.length < 10 || digits.length > 12) {
        return 'Telefonu 0 (5xx) xxx xx xx biçiminde yazın ya da boş bırakın.';
      }
      return '';
    },
    konu: function (value) {
      return value ? '' : 'Lütfen bir konu seçin.';
    },
    mesaj: function (value) {
      if (!value) return 'Lütfen mesajınızı yazın.';
      if (value.length < 10) return 'Mesaj en az 10 karakter olmalı.';
      return '';
    },
    onay: function (value, field) {
      return field.checked ? '' : 'Devam etmek için bu kutuyu işaretleyin.';
    }
  };

  function validate(field) {
    var rule = rules[field.name];
    if (!rule) return true;
    var message = rule(field.value.trim(), field);
    var errorElement = document.getElementById(field.id + '-hata');
    if (errorElement) errorElement.textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  }

  function updateCounter() {
    var length = messageField.value.length;
    counter.textContent = length ? length + ' / ' + maxLength + ' karakter' : 'En fazla ' + maxLength + ' karakter.';
  }

  function validatedFields() {
    return Array.prototype.filter.call(form.elements, function (el) { return rules[el.name]; });
  }

  form.addEventListener('input', function (event) {
    var field = event.target;
    if (field === messageField) updateCounter();
    if (triedSubmit || field.hasAttribute('aria-invalid')) validate(field);
  });

  form.addEventListener('change', function (event) {
    if (triedSubmit || event.target.hasAttribute('aria-invalid')) validate(event.target);
  });

  // Alan doluyken odaktan çıkılırsa hemen kontrol et (boş alanlara erken uyarı yok).
  form.addEventListener('focusout', function (event) {
    var field = event.target;
    if (rules[field.name] && field.type !== 'checkbox' && field.value.trim()) validate(field);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    triedSubmit = true;

    var invalid = validatedFields().filter(function (field) { return !validate(field); });
    if (invalid.length) {
      formStatus.hidden = true;
      invalid[0].focus();
      return;
    }

    // DEMO: Veri hiçbir yere gönderilmez. Gerçek sitede burada bir form
    // servisine ya da sunucuya istek atılır.
    var title = document.createElement('strong');
    title.textContent = 'Demo: mesajınız gönderilmedi.';
    formStatus.replaceChildren(
      title,
      document.createTextNode(' Bu bir tanıtım sitesi; form hiçbir yere veri iletmez. Gerçek sitede mesajınız işletmenin e-posta kutusuna ulaşır ve size yazdığınız adresten dönülür.')
    );
    formStatus.hidden = false;

    form.reset();
    triedSubmit = false;
    validatedFields().forEach(function (field) {
      field.removeAttribute('aria-invalid');
      var errorElement = document.getElementById(field.id + '-hata');
      if (errorElement) errorElement.textContent = '';
    });
    updateCounter();
    formStatus.focus();
  });
})();
