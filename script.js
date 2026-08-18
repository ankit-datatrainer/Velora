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
        window.matchMedia('(min-width: 1081px)').addEventListener('change', e => {
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

    /* ---------- Background video (hero showreel) ----------
       Decorative, so it stays muted and silent-failing. Paused whenever it is
       off screen or the tab is hidden, and never started if the visitor asked
       for reduced motion — the poster frame stands in. */
    $$('[data-bg-video]').forEach(vid => {
        vid.muted = true;
        vid.setAttribute('aria-hidden', 'true');

        // Don't spend ~3.9MB of someone's mobile data on decoration. Dropping
        // the src and calling load() cancels the in-flight fetch and leaves the
        // poster frame in place, which the gradient scrim sits over anyway.
        const skip = reduceMotion;
        if (skip) {
            vid.removeAttribute('autoplay');
            vid.pause();
            return;
        }

        const play = () => vid.play().catch(() => { });
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

    /* ---------- Talent marquees ----------
       The two roster rails drift in opposite directions. Duration is derived
       from track width so both move at the same pixels-per-second no matter how
       many cards each holds. Under reduced motion the clone is skipped and CSS
       turns the rail back into a normal horizontal scroller. */
    $$('.talent-marquee').forEach(m => {
        const track = $('.talent-track', m);
        if (!track || reduceMotion) return;

        if (m.children.length === 1) {
            const clone = track.cloneNode(true);
            // The duplicate exists only to close the loop: hide it from
            // assistive tech and keep it out of the tab order.
            clone.setAttribute('aria-hidden', 'true');
            $$('a', clone).forEach(a => { a.tabIndex = -1; });
            m.appendChild(clone);
        }

        const PX_PER_SEC = 46;
        const setDuration = () => {
            const w = track.scrollWidth;
            if (w) m.style.setProperty('--dur', `${Math.max(24, Math.round(w / PX_PER_SEC))}s`);
        };
        setDuration();
        window.addEventListener('resize', setDuration, { passive: true });
    });

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

    /* ---------- Talent marquee looping ---------- */
    $$('.talent-marquee').forEach(marquee => {
        const track = $('.talent-track', marquee);
        if (!track) return;
        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        marquee.appendChild(clone);
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
                'New enquiry from the VELORA website',
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
                status.textContent = 'Thank you. Your enquiry is on its way — the VELORA team replies within one business day.';
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

    /* ======================================================================
       MOTION LAYER
       Everything below is decoration. It all short-circuits under
       prefers-reduced-motion and is gated on IntersectionObserver so nothing
       animates while off screen.
       ====================================================================== */

    /* ---------- Per-character headline reveal ----------
       Only text nodes are wrapped, so <br> and nested gradient spans inside a
       heading survive untouched. */
    const splitTargets = $$('[data-split]');
    if (splitTargets.length) {
        const wrapChars = (node) => {
            const frag = document.createDocumentFragment();
            for (const raw of node.textContent) {
                if (raw === ' ') {
                    const sp = document.createElement('span');
                    sp.className = 'sp';
                    sp.textContent = ' ';
                    frag.appendChild(sp);
                    continue;
                }
                const ch = document.createElement('span');
                ch.className = 'ch';
                ch.textContent = raw;
                frag.appendChild(ch);
            }
            node.replaceWith(frag);
        };

        splitTargets.forEach(el => {
            // Collect first, then mutate: the tree changes as we go.
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const texts = [];
            while (walker.nextNode()) {
                if (walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
            }
            texts.forEach(wrapChars);
            $$('.ch', el).forEach((ch, i) => ch.style.setProperty('--ci', i));
        });

        if (!('IntersectionObserver' in window) || reduceMotion) {
            splitTargets.forEach(el => el.classList.add('in'));
        } else {
            const sio = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;
                    e.target.classList.add('in');
                    sio.unobserve(e.target);
                });
            }, { threshold: 0.2 });
            splitTargets.forEach(el => sio.observe(el));
        }
    }

    /* ---------- Confetti ----------
       The bright paper-scatter that gives the hero and closing band their
       energy. Particle count scales with area and is capped so a large monitor
       does not turn this into a stress test. */
    const confettiMounts = $$('.confetti');
    if (confettiMounts.length && !reduceMotion) {
        const COLOURS = ['#ffc021', '#ff5b6e', '#23d9b0', '#ffffff', '#7a4df0', '#ffe9a6'];

        confettiMounts.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let dpr = 1, w = 0, h = 0, bits = [], raf = null, visible = false;

            const seed = (bit, top) => {
                bit.x = Math.random() * w;
                bit.y = top ? -20 - Math.random() * h * 0.4 : Math.random() * h;
                bit.size = 5 + Math.random() * 8;
                bit.vy = 14 + Math.random() * 26;          // px per second
                bit.vx = (Math.random() - 0.5) * 18;
                bit.rot = Math.random() * Math.PI * 2;
                bit.vr = (Math.random() - 0.5) * 2.2;
                bit.colour = COLOURS[(Math.random() * COLOURS.length) | 0];
                bit.round = Math.random() < 0.35;
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

                const want = Math.max(18, Math.min(70, Math.round((w * h) / 16000)));
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
                    ctx.globalAlpha = 0.85;
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
            window.addEventListener('resize', () => { resize(); }, { passive: true });
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

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Magnetic buttons ---------- */
    if (finePointer && !reduceMotion) {
        $$('.magnetic').forEach(el => {
            const pull = (e) => {
                const r = el.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
                const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
                el.style.setProperty('--mx', `${Math.max(-1, Math.min(1, dx)) * 7}px`);
                el.style.setProperty('--my', `${Math.max(-1, Math.min(1, dy)) * 7}px`);
            };
            const reset = () => {
                el.style.setProperty('--mx', '0px');
                el.style.setProperty('--my', '0px');
            };
            el.addEventListener('mousemove', pull);
            el.addEventListener('mouseleave', reset);
        });
    }

    /* ---------- 3D tilt ---------- */
    if (finePointer && !reduceMotion) {
        $$('[data-tilt]').forEach(el => {
            const max = parseFloat(el.dataset.tilt) || 7;
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                el.style.setProperty('--ry', `${px * max * 2}deg`);
                el.style.setProperty('--rx', `${-py * max * 2}deg`);
            });
            el.addEventListener('mouseleave', () => {
                el.style.setProperty('--rx', '0deg');
                el.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ---------- Scroll parallax ----------
       data-parallax holds a speed: positive drifts up, negative drifts down. */
    const parallaxEls = $$('[data-parallax]');
    if (parallaxEls.length && !reduceMotion) {
        let queued = false;
        const apply = () => {
            queued = false;
            const mid = window.innerHeight / 2;
            for (const el of parallaxEls) {
                const r = el.getBoundingClientRect();
                if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
                const speed = parseFloat(el.dataset.parallax) || 0.08;
                el.style.setProperty('--py', `${((r.top + r.height / 2) - mid) * -speed}px`);
            }
        };
        const onScroll = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(apply);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        apply();
    }

    /* ---------- Cursor follower ---------- */
    if (finePointer && !reduceMotion) {
        const dot = document.createElement('div');
        dot.className = 'cursor';
        dot.setAttribute('aria-hidden', 'true');
        document.body.appendChild(dot);

        let tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;

        window.addEventListener('mousemove', (e) => {
            tx = e.clientX;
            ty = e.clientY;
            dot.classList.add('show');
        }, { passive: true });

        document.addEventListener('mouseleave', () => dot.classList.remove('show'));

        const ease = () => {
            cx += (tx - cx) * 0.18;
            cy += (ty - cy) * 0.18;
            dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
            requestAnimationFrame(ease);
        };
        requestAnimationFrame(ease);

        // Swell over anything interactive.
        document.addEventListener('mouseover', (e) => {
            const hot = e.target.closest('a, button, .ig-item, .gallery figure, .face-item, input, select, textarea');
            dot.classList.toggle('grow', Boolean(hot));
        });
    }
})();
