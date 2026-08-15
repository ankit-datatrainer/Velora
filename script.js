/* ==========================================================================
   VELORA — site interactions
   Vanilla JS, no dependencies. Progressive: every feature guards for its DOM.
   ========================================================================== */
(() => {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Preloader ---------- */
    const preloader = $('.preloader');
    if (preloader) {
        const dismiss = () => preloader.classList.add('done');
        window.addEventListener('load', () => setTimeout(dismiss, reduceMotion ? 0 : 550));
        // Safety net so the page is never trapped behind the loader.
        setTimeout(dismiss, 3500);
    }

    /* ---------- Navbar: stick + auto-hide on scroll down ---------- */
    const nav = $('.nav');
    if (nav) {
        let lastY = window.scrollY;
        const onNavScroll = () => {
            const y = window.scrollY;
            nav.classList.toggle('stuck', y > 40);
            const drawerOpen = $('.nav-drawer')?.classList.contains('open');
            nav.classList.toggle('hide', y > 420 && y > lastY && !drawerOpen);
            lastY = y;
        };
        window.addEventListener('scroll', onNavScroll, { passive: true });
        onNavScroll();
    }

    /* ---------- Mobile / tablet drawer ---------- */
    const burger = $('.burger');
    const drawer = $('.nav-drawer');
    if (burger && drawer) {
        const setDrawer = (open) => {
            burger.setAttribute('aria-expanded', String(open));
            drawer.classList.toggle('open', open);
            document.body.classList.toggle('nav-open', open);
        };
        burger.addEventListener('click', () => {
            setDrawer(burger.getAttribute('aria-expanded') !== 'true');
        });
        $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') setDrawer(false);
        });
        // Close automatically if the viewport grows into desktop layout.
        window.matchMedia('(min-width: 1025px)').addEventListener('change', e => {
            if (e.matches) setDrawer(false);
        });
    }

    /* ---------- Scroll progress bar ---------- */
    const bar = $('.scroll-progress');
    if (bar) {
        const update = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        };
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ---------- Reveal on scroll ---------- */
    const revealables = $$('[data-reveal]');
    if (revealables.length) {
        if (!('IntersectionObserver' in window) || reduceMotion) {
            revealables.forEach(el => el.classList.add('in'));
        } else {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

            revealables.forEach((el, i) => {
                // Stagger siblings inside the same grid/row for a cascading entrance.
                if (!el.style.getPropertyValue('--d')) {
                    const sibs = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal')) : [];
                    const idx = sibs.indexOf(el);
                    el.style.setProperty('--d', `${(idx > 0 ? idx : 0) * 90}ms`);
                }
                io.observe(el);
            });
        }
    }

    /* ---------- Animated counters ---------- */
    const counters = $$('[data-count]');
    if (counters.length) {
        const run = (el) => {
            const target = parseFloat(el.dataset.count);
            const suffix = el.dataset.suffix || '';
            const decimals = (el.dataset.count.split('.')[1] || '').length;
            if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
            const dur = 1600;
            const t0 = performance.now();
            const tick = (now) => {
                const p = Math.min((now - t0) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = (target * eased).toFixed(decimals) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        if (!('IntersectionObserver' in window)) {
            counters.forEach(run);
        } else {
            const cio = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    run(entry.target);
                    cio.unobserve(entry.target);
                });
            }, { threshold: 0.5 });
            counters.forEach(el => cio.observe(el));
        }
    }

    /* ---------- Hero showreel controls ---------- */
    const video = $('#showreel');
    if (video) {
        video.muted = true;                       // required for autoplay
        const play = () => video.play().catch(() => { });
        if (reduceMotion) { video.pause(); } else { play(); }

        const soundBtn = $('#sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                video.muted = !video.muted;
                if (!video.muted) play();
                soundBtn.setAttribute('aria-label', video.muted ? 'Unmute showreel' : 'Mute showreel');
                soundBtn.querySelector('.on').hidden = video.muted;
                soundBtn.querySelector('.off').hidden = !video.muted;
            });
        }

        const playBtn = $('#play-toggle');
        if (playBtn) {
            const sync = () => {
                playBtn.querySelector('.ic-play').hidden = !video.paused;
                playBtn.querySelector('.ic-pause').hidden = video.paused;
                playBtn.setAttribute('aria-label', video.paused ? 'Play showreel' : 'Pause showreel');
            };
            playBtn.addEventListener('click', () => { video.paused ? play() : video.pause(); });
            video.addEventListener('play', sync);
            video.addEventListener('pause', sync);
            sync();
        }

        // Don't burn CPU/battery on a video nobody can see.
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) { if (!video.dataset.userPaused && !reduceMotion) play(); }
                    else video.pause();
                });
            }, { threshold: 0.15 }).observe(video);
            video.addEventListener('pause', () => {
                if (video.getBoundingClientRect().bottom > 0) video.dataset.userPaused = '1';
            });
            video.addEventListener('play', () => { delete video.dataset.userPaused; });
        }
    }

    /* ---------- Hero cine stack ----------
       Crossfades the real campaign photos behind the headline. Pauses while the
       hero is off screen and stays on the first frame if motion is reduced. */
    $$('.cine').forEach(cine => {
        const slides = $$('.cine-slide', cine);
        if (slides.length < 2) return;

        let i = slides.findIndex(s => s.classList.contains('on'));
        if (i < 0) { i = 0; slides[0].classList.add('on'); }

        if (reduceMotion) return;

        let timer = null;
        const advance = () => {
            slides[i].classList.remove('on');
            i = (i + 1) % slides.length;
            slides[i].classList.add('on');
        };
        const start = () => { if (!timer) timer = setInterval(advance, 4200); };
        const stop = () => { clearInterval(timer); timer = null; };

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                entries.forEach(e => (e.isIntersecting ? start() : stop()));
            }, { threshold: 0.1 }).observe(cine);
        } else {
            start();
        }
        document.addEventListener('visibilitychange', () => {
            document.hidden ? stop() : start();
        });
    });

    /* ---------- Testimonial slider ---------- */
    const track = $('.quotes');
    if (track) {
        const step = () => {
            const card = track.firstElementChild;
            return card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
        };
        $('.quotes-prev')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
        $('.quotes-next')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    }

    /* ---------- Accordion ---------- */
    $$('.acc-item').forEach(item => {
        const trigger = $('.acc-trigger', item);
        if (!trigger) return;
        trigger.addEventListener('click', () => {
            const open = item.classList.contains('open');
            // Single-open behaviour keeps long FAQ lists scannable.
            item.closest('.accordion')?.querySelectorAll('.acc-item.open').forEach(other => {
                other.classList.remove('open');
                $('.acc-trigger', other)?.setAttribute('aria-expanded', 'false');
            });
            if (!open) {
                item.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });

    /* ---------- Gallery lightbox ---------- */
    const lightbox = $('.lightbox');
    const figures = $$('.gallery figure');
    if (lightbox && figures.length) {
        const imgEl = $('img', lightbox);
        const capEl = $('.lightbox-caption', lightbox);
        let index = 0;

        const show = (i) => {
            index = (i + figures.length) % figures.length;
            const source = $('img', figures[index]);
            imgEl.src = source.dataset.full || source.src;
            imgEl.alt = source.alt || '';
            if (capEl) capEl.textContent = $('figcaption', figures[index])?.textContent || '';
        };

        const open = (i) => {
            show(i);
            lightbox.classList.add('open');
            document.body.classList.add('nav-open');
            $('.lightbox-close', lightbox)?.focus();
        };

        const close = () => {
            lightbox.classList.remove('open');
            document.body.classList.remove('nav-open');
        };

        figures.forEach((fig, i) => {
            fig.tabIndex = 0;
            fig.setAttribute('role', 'button');
            fig.addEventListener('click', () => open(i));
            fig.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
            });
        });

        $('.lightbox-close', lightbox)?.addEventListener('click', close);
        $('.lightbox .prev')?.addEventListener('click', () => show(index - 1));
        $('.lightbox .next')?.addEventListener('click', () => show(index + 1));
        lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

        document.addEventListener('keydown', e => {
            if (!lightbox.classList.contains('open')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') show(index + 1);
            if (e.key === 'ArrowLeft') show(index - 1);
        });
    }

    /* ---------- Contact form validation ---------- */
    const form = $('#velora-form');
    if (form) {
        const status = $('.form-status', form);

        const validate = (field) => {
            const input = $('input, select, textarea', field);
            if (!input) return true;
            let ok = input.checkValidity() && input.value.trim() !== '';
            if (ok && input.type === 'tel') ok = /^[0-9+\-\s()]{8,18}$/.test(input.value.trim());
            field.classList.toggle('invalid', !ok);
            return ok;
        };

        $$('.field', form).forEach(field => {
            const input = $('input, select, textarea', field);
            input?.addEventListener('blur', () => { if (input.value) validate(field); });
            input?.addEventListener('input', () => field.classList.remove('invalid'));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const required = $$('.field', form).filter(f => $('[required]', f));
            const bad = required.filter(f => !validate(f));

            if (bad.length) {
                bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                $('input, select, textarea', bad[0])?.focus({ preventScroll: true });
                return;
            }

            // No backend wired up yet — hand the enquiry off over WhatsApp/email
            // so no lead is lost, and confirm inline.
            const data = new FormData(form);
            const lines = [
                'New enquiry from velora.com',
                `Name: ${data.get('name') || ''}`,
                `Email: ${data.get('email') || ''}`,
                `Phone: ${data.get('phone') || ''}`,
                `Company: ${data.get('company') || ''}`,
                `Service: ${data.get('service') || ''}`,
                `Budget: ${data.get('budget') || ''}`,
                `Source: ${data.get('source') || ''}`,
                `Message: ${data.get('message') || ''}`
            ].join('\n');

            if (status) {
                status.textContent = 'Thank you. Your enquiry is on its way — the Velora team replies within one business day.';
                status.classList.add('show');
            }

            window.open(`https://wa.me/919013920785?text=${encodeURIComponent(lines)}`, '_blank', 'noopener');
            form.reset();
        });
    }

    /* ---------- Back to top ---------- */
    const toTop = $('.float-btn.top');
    if (toTop) {
        window.addEventListener('scroll', () => {
            toTop.classList.toggle('show', window.scrollY > 700);
        }, { passive: true });
        toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    /* ---------- Current year ---------- */
    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

    /* ---------- Marquee: duplicate content for a seamless loop ---------- */
    $$('.marquee').forEach(m => {
        const t = $('.marquee-track', m);
        if (t && m.children.length === 1) m.appendChild(t.cloneNode(true));
    });
})();
