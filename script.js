/* ==========================================================================
   VELORA — Influencer Marketing Agency Interactions
   Vanilla JS with progressive enhancements and high-performance motion.
   ========================================================================== */
(() => {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. Preloader ---------- */
    const preloader = $('.preloader');
    if (preloader) {
        const dismiss = () => preloader.classList.add('done');
        window.addEventListener('load', () => setTimeout(dismiss, reduceMotion ? 0 : 450));
        setTimeout(dismiss, 3000); // Safety fallback
    }

    /* ---------- 2. Navbar: stick + auto-hide on scroll ---------- */
    const nav = $('.nav');
    if (nav) {
        let lastY = window.scrollY;
        const onNavScroll = () => {
            const y = window.scrollY;
            nav.classList.toggle('stuck', y > 40);
            const drawerOpen = $('.nav-drawer')?.classList.contains('open');
            nav.classList.toggle('hide', y > 380 && y > lastY && !drawerOpen);
            lastY = y;
        };
        window.addEventListener('scroll', onNavScroll, { passive: true });
        onNavScroll();
    }

    /* ---------- 3. Mobile / Tablet Drawer ---------- */
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
        window.matchMedia('(min-width: 1081px)').addEventListener('change', e => {
            if (e.matches) setDrawer(false);
        });
    }

    /* ---------- 4. Scroll Progress Bar ---------- */
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

    /* ---------- 5. Reveal On Scroll ---------- */
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
            }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

            revealables.forEach((el) => {
                if (!el.style.getPropertyValue('--d')) {
                    const sibs = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal')) : [];
                    const idx = sibs.indexOf(el);
                    el.style.setProperty('--d', `${(idx > 0 ? idx : 0) * 80}ms`);
                }
                io.observe(el);
            });
        }
    }

    /* ---------- 6. Animated Number Counters ---------- */
    const counters = $$('[data-count]');
    if (counters.length) {
        const run = (el) => {
            const target = parseFloat(el.dataset.count);
            const suffix = el.dataset.suffix || '';
            const decimals = (el.dataset.count.split('.')[1] || '').length;
            if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
            const dur = 1500;
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
            }, { threshold: 0.4 });
            counters.forEach(el => cio.observe(el));
        }
    }

    /* ---------- 7. Video Controls & Background Video ---------- */
    const video = $('#showreel');
    if (video) {
        video.muted = true;
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
                const icPlay = playBtn.querySelector('.ic-play');
                const icPause = playBtn.querySelector('.ic-pause');
                if (icPlay) icPlay.hidden = !video.paused;
                if (icPause) icPause.hidden = video.paused;
                playBtn.setAttribute('aria-label', video.paused ? 'Play showreel' : 'Pause showreel');
            };
            playBtn.addEventListener('click', () => { video.paused ? play() : video.pause(); });
            video.addEventListener('play', sync);
            video.addEventListener('pause', sync);
            sync();
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) { if (!video.dataset.userPaused && !reduceMotion) play(); }
                    else video.pause();
                });
            }, { threshold: 0.15 }).observe(video);
        }
    }

    $$('[data-bg-video], .hero-video video').forEach(vid => {
        vid.muted = true;
        vid.defaultMuted = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.setAttribute('aria-hidden', 'true');
        if (reduceMotion) { vid.pause(); return; }
        const play = () => {
            const res = vid.play();
            if (res !== undefined) {
                res.catch(() => {
                    const fallbackPlay = () => {
                        vid.play().catch(() => {});
                        ['click', 'touchstart', 'scroll'].forEach(evt => window.removeEventListener(evt, fallbackPlay));
                    };
                    ['click', 'touchstart', 'scroll'].forEach(evt => window.addEventListener(evt, fallbackPlay, { once: true, passive: true }));
                });
            }
        };
        play();
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                entries.forEach(e => (e.isIntersecting ? play() : vid.pause()));
            }, { threshold: 0.05 }).observe(vid);
        }
        document.addEventListener('visibilitychange', () => {
            document.hidden ? vid.pause() : play();
        });
    });

    /* ---------- 8. Marquee Duplication for Seamless Loops ---------- */
    $$('.talent-marquee, .quotes-marquee-wrap, .marquee').forEach(container => {
        const track = container.querySelector('.talent-track, .quotes-track, .marquee-track');
        if (track && container.children.length === 1 && !reduceMotion) {
            const clone = track.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            $$('a', clone).forEach(a => { a.tabIndex = -1; });
            container.appendChild(clone);
        }
    });

    /* ---------- 9. Accordion ---------- */
    $$('.acc-item').forEach(item => {
        const trigger = $('.acc-trigger', item);
        if (!trigger) return;
        trigger.addEventListener('click', () => {
            const open = item.classList.contains('open');
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

    /* ---------- 10. Interactive Dual Form (Brand vs Creator) ---------- */
    const form = $('#velora-form');
    const toggleBtns = $$('.form-toggle-btn');
    let currentRole = 'brand'; // 'brand' or 'creator'

    if (toggleBtns.length && form) {
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRole = btn.dataset.role || 'brand';

                // Toggle visibility of role-specific fields
                $$('[data-for-role]', form).forEach(field => {
                    const forRole = field.dataset.forRole;
                    const match = (forRole === currentRole || forRole === 'both');
                    // Clear the inline value rather than forcing a display mode.
                    // .field is a grid (label stacked over its input), so hardcoding
                    // 'flex' here would lay the label out beside the input.
                    field.style.display = match ? '' : 'none';
                    const inputs = $$('input, select, textarea', field);
                    inputs.forEach(inp => {
                        if (inp.dataset.originalRequired !== undefined) {
                            inp.required = match && inp.dataset.originalRequired === 'true';
                        } else {
                            inp.dataset.originalRequired = String(inp.required);
                            inp.required = match && inp.required;
                        }
                    });
                });
            });
        });

        // Initialize state
        toggleBtns[0]?.click();
    }

    if (form) {
        const status = $('.form-status', form);

        const validate = (field) => {
            if (field.style.display === 'none') return true;
            const input = $('input, select, textarea', field);
            if (!input || !input.required) return true;
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
            const visibleRequired = $$('.field', form).filter(f => f.style.display !== 'none' && $('[required]', f));
            const bad = visibleRequired.filter(f => !validate(f));

            if (bad.length) {
                bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                $('input, select, textarea', bad[0])?.focus({ preventScroll: true });
                return;
            }

            const data = new FormData(form);
            const isBrand = currentRole === 'brand';

            const lines = [
                `*New ${isBrand ? 'Brand Campaign' : 'Creator Collab'} Enquiry — VELORA*`,
                `Type: ${isBrand ? "Brand / Business" : "Content Creator / Influencer"}`,
                `Name: ${data.get('name') || ''}`,
                `Email: ${data.get('email') || ''}`,
                `Phone: ${data.get('phone') || ''}`,
                isBrand ? `Company / Brand: ${data.get('company') || ''}` : `Social Profile / Channel: ${data.get('creator_handle') || ''}`,
                isBrand ? `Service: ${data.get('service') || ''}` : `Follower Count / Niche: ${data.get('creator_tier') || ''}`,
                isBrand ? `Budget: ${data.get('budget') || ''}` : `Collab Interest: ${data.get('creator_collab_type') || ''}`,
                `Message / Requirement: ${data.get('message') || ''}`
            ].filter(Boolean).join('\n');

            if (status) {
                status.textContent = 'Thank you! Your enquiry is ready. Opening WhatsApp to connect directly with the VELORA team.';
                status.classList.add('show');
            }

            window.open(`https://wa.me/919013920785?text=${encodeURIComponent(lines)}`, '_blank', 'noopener');
            form.reset();
        });
    }

    /* ---------- 10b. Campaign reel lightbox ----------
       The work cards advertise a play affordance, so it has to actually play
       something. The modal is built on demand rather than shipped in every
       page's markup, since only the homepage carries work cards. */
    const workPlayBtns = $$('[data-work-video]');
    if (workPlayBtns.length) {
        let box = null, boxVideo = null, boxCaption = null, lastFocused = null;

        const build = () => {
            box = document.createElement('div');
            box.className = 'lightbox lightbox-video';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-label', 'Campaign reel');
            box.innerHTML =
                '<button class="lightbox-close" type="button" aria-label="Close reel">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
                '</button>' +
                '<div class="lightbox-stage">' +
                '<video controls playsinline preload="metadata"></video>' +
                '<p class="lightbox-caption"></p>' +
                '</div>';
            document.body.appendChild(box);
            boxVideo = $('video', box);
            boxCaption = $('.lightbox-caption', box);

            $('.lightbox-close', box).addEventListener('click', close);
            box.addEventListener('click', (e) => { if (e.target === box) close(); });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && box.classList.contains('open')) close();
            });
        };

        function close() {
            if (!box) return;
            box.classList.remove('open');
            boxVideo.pause();
            document.body.classList.remove('nav-open');
            lastFocused?.focus();
        }

        const open = (src, title, trigger) => {
            if (!box) build();
            lastFocused = trigger;
            boxVideo.src = src;
            boxCaption.textContent = title || '';
            box.classList.add('open');
            document.body.classList.add('nav-open'); // reuse the scroll lock
            if (!reduceMotion) boxVideo.play().catch(() => { });
            $('.lightbox-close', box).focus();
        };

        workPlayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                open(btn.dataset.workVideo, btn.dataset.workTitle, btn);
            });
        });
    }

    /* ---------- 11. "Hire Top Creators" CTA trigger ---------- */
    $$('[data-hire-creators]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const formSection = $('#enquiry') || $('#contact-form');
            if (formSection) {
                e.preventDefault();
                formSection.scrollIntoView({ behavior: 'smooth' });
                // Switch form to Brand mode
                const brandToggle = $('[data-role="brand"]');
                if (brandToggle) brandToggle.click();
                const serviceSelect = $('#service');
                if (serviceSelect) serviceSelect.value = 'Influencer Marketing';
            }
        });
    });

    /* ---------- 12. Floating Action Controls & Helpers ---------- */
    const toTop = $('.float-btn.top');
    if (toTop) {
        window.addEventListener('scroll', () => {
            toTop.classList.toggle('show', window.scrollY > 600);
        }, { passive: true });
        toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

    /* ---------- 13. Confetti Animation (Luxury Purple & Pink) ---------- */
    const confettiMounts = $$('.confetti');
    if (confettiMounts.length && !reduceMotion) {
        const COLOURS = ['#ec4899', '#f472b6', '#a855f7', '#c084fc', '#fbbf24', '#ffffff'];

        confettiMounts.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let dpr = 1, w = 0, h = 0, bits = [], raf = null, visible = false;

            const seed = (bit, top) => {
                bit.x = Math.random() * w;
                bit.y = top ? -20 - Math.random() * h * 0.4 : Math.random() * h;
                bit.size = 4 + Math.random() * 6;
                bit.vy = 12 + Math.random() * 22;
                bit.vx = (Math.random() - 0.5) * 14;
                bit.rot = Math.random() * Math.PI * 2;
                bit.vr = (Math.random() - 0.5) * 1.8;
                bit.colour = COLOURS[(Math.random() * COLOURS.length) | 0];
                bit.round = Math.random() < 0.4;
                return bit;
            };

            const resize = () => {
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                dpr = Math.min(window.devicePixelRatio || 1, 2);
                w = rect.width;
                h = rect.height;
                canvas.width = Math.round(w * dpr);
                canvas.height = Math.round(h * dpr);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                const want = Math.max(16, Math.min(50, Math.round((w * h) / 18000)));
                if (bits.length > want) bits.length = want;
                while (bits.length < want) bits.push(seed({}, false));
            };

            let last = 0;
            const frame = (now) => {
                const dt = Math.min((now - last) / 1000 || 0, 0.05);
                last = now;
                ctx.clearRect(0, 0, w, h);

                for (const b of bits) {
                    b.y += b.vy * dt;
                    b.x += b.vx * dt;
                    b.rot += b.vr * dt;
                    if (b.y - b.size > h) seed(b, true);

                    ctx.save();
                    ctx.translate(b.x, b.y);
                    ctx.rotate(b.rot);
                    ctx.fillStyle = b.colour;
                    ctx.globalAlpha = 0.8;
                    if (b.round) {
                        ctx.beginPath();
                        ctx.arc(0, 0, b.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
                    }
                    ctx.restore();
                }
                raf = requestAnimationFrame(frame);
            };

            const start = () => {
                if (raf || !visible || document.hidden) return;
                last = performance.now();
                raf = requestAnimationFrame(frame);
            };
            const stop = () => { cancelAnimationFrame(raf); raf = null; };

            resize();
            window.addEventListener('resize', resize, { passive: true });
            document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

            if ('IntersectionObserver' in window) {
                new IntersectionObserver(entries => {
                    entries.forEach(e => { visible = e.isIntersecting; visible ? start() : stop(); });
                }, { threshold: 0 }).observe(canvas);
            } else {
                visible = true;
                start();
            }
        });
    }

    /* ---------- 14. Magnetic Buttons & Subtle Parallax ---------- */
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (finePointer && !reduceMotion) {
        $$('.magnetic').forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
                const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
                el.style.transform = `translate3d(${dx * 6}px, ${dy * 6}px, 0)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = `translate3d(0, 0, 0)`;
            });
        });
    }
})();
