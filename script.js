/* ============================================================
   Arias Landscaping — site scripts
   ------------------------------------------------------------
   FORM_ENDPOINT: the Formspree form that emails
   ariaslandscaping912@gmail.com. This is a public form ID, not a
   secret — the email address and delivery settings live in the
   Formspree dashboard, never in this code.
   ============================================================ */
const FORM_ENDPOINT = "https://formspree.io/f/FORMSPREE_FORM_ID";
const MAX_PHOTOS = 8;
const MAX_PHOTO_MB = 10;

(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  const nav = $("#main-nav");
  const toggle = $("#menu-toggle");
  function closeMenu() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }
  toggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });

  /* ---------- Smooth scroll with sticky-header offset ---------- */
  const header = $(".site-header");
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.pageYOffset - header.offsetHeight - 8;
      window.scrollTo({ top: id === "#top" ? 0 : y, behavior: "smooth" });
      if (id === "#request") setTimeout(() => $("#name")?.focus({ preventScroll: true }), 600);
      history.replaceState(null, "", id);
    });
  });

  /* ---------- Mobile sticky CTA: hide while the form is on screen ---------- */
  const mobileCta = $("#mobile-cta");
  const requestSection = $("#request");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      mobileCta.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(requestSection);
  }

  /* ---------- Gallery ---------- */
  const items = Array.isArray(window.GALLERY_ITEMS) ? window.GALLERY_ITEMS : [];
  const grid = $("#gallery-grid");
  const note = $("#gallery-note");

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, v);
    });
    children.forEach((c) => n.appendChild(c));
    return n;
  }

  function buildBeforeAfter(item, lazy) {
    const wrap = el("div", { class: "ba", style: "--split:50%" });
    const before = el("img", { src: item.before, alt: item.alt + " (before)", loading: lazy ? "lazy" : "eager", decoding: "async", width: "1200", height: "900" });
    const after = el("img", { class: "ba-after", src: item.after, alt: item.alt + " (after)", loading: lazy ? "lazy" : "eager", decoding: "async", width: "1200", height: "900" });
    const handle = el("div", { class: "ba-handle" });
    const range = el("input", { type: "range", class: "ba-range", min: "0", max: "100", value: "50", "aria-label": "Drag to compare before and after" });
    range.addEventListener("input", () => wrap.style.setProperty("--split", range.value + "%"));
    wrap.append(before, after, handle, el("span", { class: "ba-tag ba-tag-before", text: "Before" }), el("span", { class: "ba-tag ba-tag-after", text: "After" }), range);
    return wrap;
  }

  function buildCard(item, index) {
    const media = el("div", { class: "gallery-media" });
    if (item.type === "before-after") {
      media.appendChild(buildBeforeAfter(item, index > 2));
      const zoom = el("button", { class: "ba-zoom", type: "button", "aria-label": "Enlarge " + item.caption, html: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M11 8v6M8 11h6"/></svg>' });
      zoom.addEventListener("click", () => openLightbox(index));
      media.appendChild(zoom);
    } else {
      media.appendChild(el("img", { src: item.src, alt: item.alt, loading: index > 2 ? "lazy" : "eager", decoding: "async", width: "1200", height: "900" }));
      const btn = el("button", { class: "gallery-open", type: "button", "aria-label": "Enlarge " + item.caption });
      btn.addEventListener("click", () => openLightbox(index));
      media.appendChild(btn);
    }
    const cap = el("div", { class: "gallery-caption" }, [el("span", { text: item.caption })]);
    if (item.placeholder) cap.appendChild(el("span", { class: "gallery-badge", text: "Sample placeholder" }));
    return el("article", { class: "gallery-item" }, [media, cap]);
  }

  if (items.length) {
    items.forEach((item, i) => grid.appendChild(buildCard(item, i)));
  } else {
    note.hidden = false;
  }

  /* ---------- Lightbox ---------- */
  const lightbox = $("#lightbox");
  const lbMedia = $("#lightbox-media");
  const lbCaption = $("#lightbox-caption");
  let current = 0;
  let lastFocus = null;

  function renderLightbox() {
    const item = items[current];
    lbMedia.innerHTML = "";
    if (item.type === "before-after") lbMedia.appendChild(buildBeforeAfter(item, false));
    else lbMedia.appendChild(el("img", { src: item.src, alt: item.alt }));
    lbCaption.textContent = item.caption;
    $("#lightbox-prev").hidden = $("#lightbox-next").hidden = items.length < 2;
  }
  function openLightbox(i) {
    current = i; lastFocus = document.activeElement;
    renderLightbox();
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    $("#lightbox-close").focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    lastFocus?.focus();
  }
  $("#lightbox-close").addEventListener("click", closeLightbox);
  $("#lightbox-prev").addEventListener("click", () => { current = (current - 1 + items.length) % items.length; renderLightbox(); });
  $("#lightbox-next").addEventListener("click", () => { current = (current + 1) % items.length; renderLightbox(); });
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") $("#lightbox-prev").click();
    if (e.key === "ArrowRight") $("#lightbox-next").click();
  });

  /* ---------- Request form ---------- */
  const form = $("#request-form");
  const submitBtn = $("#submit-btn");
  const status = $("#form-status");
  const photosInput = $("#photos");
  const photoList = $("#photo-list");
  let selectedPhotos = [];
  let submitting = false;

  function setError(id, msg) {
    const field = $("#" + id);
    const err = $("#" + id + "-error");
    if (err) err.textContent = msg || "";
    if (field) {
      field.classList.toggle("is-invalid", Boolean(msg));
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) field.setAttribute("aria-describedby", id + "-error"); else field.removeAttribute("aria-describedby");
    }
  }

  function validate() {
    let firstBad = null;
    const need = (id, label) => {
      const v = $("#" + id).value.trim();
      if (!v) { setError(id, label + " is required."); firstBad = firstBad || $("#" + id); return false; }
      setError(id, ""); return true;
    };
    need("name", "Full name");
    if (need("phone", "Phone number")) {
      const digits = $("#phone").value.replace(/\D/g, "");
      if (digits.length < 10) { setError("phone", "Please enter a valid phone number."); firstBad = firstBad || $("#phone"); }
    }
    const email = $("#email").value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setError("email", "Please enter a valid email address."); firstBad = firstBad || $("#email"); }
    else setError("email", "");
    need("address", "Service address");
    need("city", "City");
    if (need("zip", "ZIP code") && !/^\d{5}(-\d{4})?$/.test($("#zip").value.trim())) { setError("zip", "Please enter a 5-digit ZIP code."); firstBad = firstBad || $("#zip"); }
    const services = $$('input[name="Services Needed"]:checked');
    const sErr = $("#services-error");
    if (!services.length) { sErr.textContent = "Please select at least one service (or \"Other / Not Sure\")."; firstBad = firstBad || $('input[name="Services Needed"]'); }
    else sErr.textContent = "";
    if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return !firstBad;
  }

  // Clear errors as the user fixes them
  ["name", "phone", "email", "address", "city", "zip"].forEach((id) => {
    $("#" + id).addEventListener("input", () => setError(id, ""));
  });
  $$('input[name="Services Needed"]').forEach((c) => c.addEventListener("change", () => { $("#services-error").textContent = ""; }));

  /* Photo selection: keep our own list so users can add in multiple batches and remove individual photos */
  function renderPhotos() {
    photoList.innerHTML = "";
    selectedPhotos.forEach((file, i) => {
      const li = el("li");
      const img = el("img", { alt: "" });
      const url = URL.createObjectURL(file);
      img.src = url; img.onload = () => URL.revokeObjectURL(url);
      const remove = el("button", { type: "button", "aria-label": "Remove " + file.name, html: "&times;" });
      remove.addEventListener("click", () => { selectedPhotos.splice(i, 1); renderPhotos(); });
      li.append(img, el("span", { text: file.name.length > 22 ? file.name.slice(0, 19) + "…" : file.name }), remove);
      photoList.appendChild(li);
    });
  }
  photosInput.addEventListener("change", () => {
    const err = $("#photos-error"); err.textContent = "";
    const incoming = Array.from(photosInput.files || []);
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) { err.textContent = "Only image files can be uploaded."; continue; }
      if (f.size > MAX_PHOTO_MB * 1024 * 1024) { err.textContent = `Each photo must be under ${MAX_PHOTO_MB} MB.`; continue; }
      if (selectedPhotos.length >= MAX_PHOTOS) { err.textContent = `You can attach up to ${MAX_PHOTOS} photos.`; break; }
      if (!selectedPhotos.some((p) => p.name === f.name && p.size === f.size)) selectedPhotos.push(f);
    }
    photosInput.value = "";
    renderPhotos();
  });

  function buildPayload(includePhotos) {
    const fd = new FormData();
    const name = $("#name").value.trim();
    fd.append("_subject", "NEW LANDSCAPING REQUEST — " + name);
    const email = $("#email").value.trim();
    if (email) fd.append("_replyto", email);
    fd.append("_gotcha", $("#hp-website").value);

    // Ordered so the email reads top-to-bottom the way the owner needs it
    fd.append("Customer Name", name);
    fd.append("Phone", $("#phone").value.trim());
    fd.append("Email", email || "Not provided");
    fd.append("Service Address", `${$("#address").value.trim()}, ${$("#city").value.trim()}, GA ${$("#zip").value.trim()}`);
    fd.append("Property Type", form.elements["Property Type"].value);
    fd.append("Selected Services", $$('input[name="Services Needed"]:checked').map((c) => c.value).join(", "));
    fd.append("Project Description", $("#details").value.trim() || "None provided");
    fd.append("Preferred Contact Method", form.elements["Preferred Contact Method"].value);
    fd.append("Requested Timeframe", $("#timing").value);

    if (selectedPhotos.length) {
      fd.append("Photos", includePhotos ? `${selectedPhotos.length} photo(s) attached` : `${selectedPhotos.length} photo(s) selected by customer — could not be attached; ask customer to text them`);
      if (includePhotos) selectedPhotos.forEach((f, i) => fd.append("upload", f, f.name));
    } else {
      fd.append("Photos", "None");
    }
    return fd;
  }

  async function send(includePhotos) {
    const res = await fetch(FORM_ENDPOINT, { method: "POST", body: buildPayload(includePhotos), headers: { Accept: "application/json" } });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = (data.errors || []).map((e) => e.message).join(" ") || data.error || "";
      const err = new Error(msg || "Request failed");
      err.status = res.status; err.detail = msg;
      throw err;
    }
    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;
    status.className = "form-status"; status.textContent = "";
    if (!validate()) return;

    submitting = true;
    submitBtn.classList.add("is-loading");
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.disabled = true;
    let photosDropped = false;

    try {
      try {
        await send(true);
      } catch (err) {
        // If the photos are what failed (size/plan limits), resend the request without them
        // so the lead still reaches the business, then tell the customer.
        if (selectedPhotos.length && (err.status === 413 || /file|upload|attach|large/i.test(err.detail || ""))) {
          photosDropped = true;
          await send(false);
        } else {
          throw err;
        }
      }
      form.hidden = true;
      const success = $("#form-success");
      const noteEl = $("#success-note");
      if (photosDropped) {
        noteEl.textContent = "Your photos couldn't be attached, but your request went through. Feel free to text your photos to 912-656-4577.";
        noteEl.hidden = false;
      }
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (err) {
      status.className = "form-status is-error";
      status.textContent = "Sorry — your request didn't go through. Please try again, or call 912-656-4577 and we'll take your information over the phone.";
      status.scrollIntoView({ block: "center", behavior: "smooth" });
    } finally {
      submitting = false;
      submitBtn.classList.remove("is-loading");
      submitBtn.removeAttribute("aria-busy");
      submitBtn.disabled = false;
    }
  });
})();
