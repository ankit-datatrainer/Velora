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

    /* ---------- 5b. Section load-in + ambient float ----------
       Every section on every page fades and floats up as it enters view, and
       gets a pair of slowly drifting backdrop orbs so it still has motion once
       it has settled. The orbs are decorative and injected here rather than
       written into seven pages of markup; they are absolutely positioned, so
       prepending one to a flex or grid section adds no layout item. */
    const sectionsFx = $$('main > section, main > div.ink-band, footer.footer');
    if (sectionsFx.length) {
        sectionsFx.forEach((sec, i) => {
            const first = sec.firstElementChild;
            const alreadyBuilt = first && first.classList.contains('sect-float');
            // The hero is skipped: it already has a video, a scrim and the
            // floating client discs, and orbs would land on top of the footage.
            // It still gets the load-in, which doubles as the page-load entrance.
            const wantsOrbs = !sec.classList.contains('hero');
            if (!reduceMotion && !alreadyBuilt && wantsOrbs) {
                const layer = document.createElement('div');
                layer.className = 'sect-float';
                layer.setAttribute('aria-hidden', 'true');
                for (let n = 0; n < 2; n += 1) {
                    const orb = document.createElement('span');
                    orb.className = 'sect-orb';
                    // Spreads drift durations across sections so adjacent ones
                    // are visibly out of phase rather than pulsing together.
                    orb.style.setProperty('--i', String((i * 2 + n) % 5));
                    layer.appendChild(orb);
                }
                sec.prepend(layer);
            }
            // Nudge each section's fade so a tall section and the one after it
            // do not arrive at exactly the same moment. Kept small — a long
            // stagger is what makes fast scrolling feel like missing content.
            sec.style.setProperty('--sd', `${(i % 3) * 45}ms`);
            sec.classList.add('sect-anim');
        });

        const settle = (el) => {
            el.classList.add('is-in');
            const done = () => el.classList.add('is-done');
            el.addEventListener('transitionend', done, { once: true });
            // transitionend never fires for a section already at its resting
            // value, or if the tab is backgrounded mid-transition.
            setTimeout(done, 1700);
        };

        if (!('IntersectionObserver' in window) || reduceMotion) {
            sectionsFx.forEach(s => s.classList.add('is-in', 'is-done'));
        } else {
            const pending = new Set(sectionsFx);

            // A generous margin on all four sides starts the fade before a
            // section reaches the viewport, so by the time it is actually on
            // screen it is already arriving. A negative margin here — the more
            // usual choice for reveal effects — held sections back until they
            // were well inside the fold and left visible gaps when scrolling.
            const sio = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) reveal(entry.target);
                });
            }, { threshold: 0, rootMargin: '400px 0px 400px 0px' });

            const reveal = (el) => {
                if (!pending.has(el)) return;
                pending.delete(el);
                sio.unobserve(el);
                settle(el);
                if (!pending.size) window.removeEventListener('scroll', onScroll);
            };

            /* Backstop for fast scrolling.
               IntersectionObserver batches its callbacks, so when the page moves
               quickly — a flick scroll, an anchor jump, a restored scroll
               position — a section can be passed before any notification is
               delivered for it, and it is then never told to reveal. It stays
               observed, so it would turn up on the way back, but scrolling down
               past content that stays blank is the bug. This sweep reveals
               anything the viewport has already reached. */
            const sweep = () => {
                pending.forEach(el => {
                    if (el.getBoundingClientRect().top < window.innerHeight * 1.1) {
                        reveal(el);
                    }
                });
            };

            let sweepQueued = false;
            function onScroll() {
                if (sweepQueued) return;
                sweepQueued = true;
                requestAnimationFrame(() => {
                    sweepQueued = false;
                    sweep();
                });
            }

            sectionsFx.forEach(s => sio.observe(s));
            window.addEventListener('scroll', onScroll, { passive: true });
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
                        vid.play().catch(() => { });
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
    $$('.quotes-marquee-wrap, .marquee').forEach(container => {
        const track = container.querySelector('.quotes-track, .marquee-track');
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

            window.open(`https://wa.me/919871788896?text=${encodeURIComponent(lines)}`, '_blank', 'noopener');
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
            toTop.classList.toggle('show', window.scrollY > 250);
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

    /* ---------- 17. Creator Campaign Reels Interactive Audio Controller ---------- */
    const reelCards = $$('.reel-card');
    if (reelCards.length) {
        reelCards.forEach(card => {
            const video = $('video', card);
            const btn = $('.reel-audio-btn', card);
            if (!video || !btn) return;

            // Start previews on representative footage instead of an intro or
            // dark title frame, and avoid decoding reels that are off-screen.
            const previewStart = Number(video.dataset.previewStart || 0);
            const seekToPreview = () => {
                if (previewStart > 0 && video.currentTime < previewStart - 0.25) {
                    video.currentTime = previewStart;
                }
            };
            const playPreview = () => {
                seekToPreview();
                if (!reduceMotion) video.play().catch(() => {});
            };

            if (video.readyState >= 1) seekToPreview();
            else video.addEventListener('loadedmetadata', seekToPreview, { once: true });
            if (previewStart > 0) video.addEventListener('timeupdate', seekToPreview);

            if ('IntersectionObserver' in window) {
                new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) playPreview();
                        else video.pause();
                    });
                }, { threshold: 0.08 }).observe(card);
            } else {
                playPreview();
            }

            const setSoundState = (unmuted) => {
                video.muted = !unmuted;
                btn.classList.toggle('is-unmuted', unmuted);
                card.classList.toggle('audio-active', unmuted);

                const mutedIcon = $('.speaker-icon.is-muted', btn);
                const unmutedIcon = $('.speaker-icon.is-unmuted', btn);
                if (mutedIcon) mutedIcon.style.display = unmuted ? 'none' : 'flex';
                if (unmutedIcon) unmutedIcon.style.display = unmuted ? 'flex' : 'none';
                btn.setAttribute('title', unmuted ? 'Click to Mute' : 'Click to Unmute');
                btn.setAttribute('aria-label', unmuted ? 'Mute audio' : 'Unmute audio');
            };

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const willUnmute = video.muted;

                // When enabling audio on one reel, mute all others for pleasant audio experience
                if (willUnmute) {
                    reelCards.forEach(otherCard => {
                        if (otherCard !== card) {
                            const otherVid = $('video', otherCard);
                            const otherBtn = $('.reel-audio-btn', otherCard);
                            if (otherVid && otherBtn) {
                                otherVid.muted = true;
                                otherBtn.classList.remove('is-unmuted');
                                otherCard.classList.remove('audio-active');
                                const mI = $('.speaker-icon.is-muted', otherBtn);
                                const uI = $('.speaker-icon.is-unmuted', otherBtn);
                                if (mI) mI.style.display = 'flex';
                                if (uI) uI.style.display = 'none';
                                otherBtn.setAttribute('title', 'Click to Unmute');
                            }
                        }
                    });
                }

                setSoundState(willUnmute);
                if (video.paused) {
                    playPreview();
                }
            });

            // Clicking the reel card or overlay redirects to the actual Instagram reel URL
            card.addEventListener('click', (e) => {
                if (e.target.closest('.reel-audio-btn')) return;
                const reelUrl = card.dataset.reelUrl;
                if (reelUrl) {
                    window.open(reelUrl, '_blank', 'noopener');
                }
            });
        });
    }

    /* ---------- 18. Hash Link Smooth Scroll & Target Alignment ---------- */
    const scrollToHash = () => {
        if (!window.location.hash) return;
        try {
            const target = document.querySelector(window.location.hash);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
            }
        } catch (e) {
            // Ignore invalid selector
        }
    };
    if (document.readyState === 'complete') {
        scrollToHash();
    } else {
        window.addEventListener('load', scrollToHash);
    }
    window.addEventListener('hashchange', scrollToHash);

    /* ---------- 19. 3D 5-Card Coverflow Carousel (Auto-Sliding) ---------- */
    const initCoverflowSlider = () => {
        const section = $('.coverflow-showcase-section');
        const deck = $('#coverflowDeck');
        const cards = $$('.coverflow-card');
        const dots = $$('.coverflow-dot');
        const prevBtn = $('#coverflowPrev');
        const nextBtn = $('#coverflowNext');

        if (!deck || cards.length !== 5) return;

        let activeIndex = 2; // Card 3 (Center / Best Seller) active initially
        let autoSlideTimer = null;
        let isPaused = false;

        const updateCoverflow = () => {
            const isMobile = window.innerWidth <= 768;
            const isPhone = window.innerWidth <= 480;
            const isTablet = window.innerWidth <= 1024 && !isMobile;

            cards.forEach((card, i) => {
                let offset = i - activeIndex;
                if (offset > 2) offset -= 5;
                if (offset < -2) offset += 5;

                card.classList.remove('is-center');

                if (offset === 0) {
                    card.classList.add('is-center');
                    card.style.transform = isPhone
                        ? 'translateX(0%) scale(1)'
                        : `translateX(0%) translateZ(100px) scale(${isMobile ? 1.05 : 1.14}) rotateY(0deg)`;
                    card.style.zIndex = '10';
                    card.style.opacity = '1';
                    card.style.filter = 'none';
                    card.style.pointerEvents = 'auto';
                } else if (offset === -1) {
                    const tx = isMobile ? -62 : isTablet ? -72 : -82;
                    card.style.transform = isPhone
                        ? `translateX(${tx}%) scale(.84)`
                        : `translateX(${tx}%) translateZ(-35px) scale(${isMobile ? 0.88 : 0.92}) rotateY(${isMobile ? 10 : 16}deg)`;
                    card.style.zIndex = '5';
                    card.style.opacity = '0.84';
                    card.style.filter = 'brightness(0.92)';
                    card.style.pointerEvents = 'auto';
                } else if (offset === 1) {
                    const tx = isMobile ? 62 : isTablet ? 72 : 82;
                    card.style.transform = isPhone
                        ? `translateX(${tx}%) scale(.84)`
                        : `translateX(${tx}%) translateZ(-35px) scale(${isMobile ? 0.88 : 0.92}) rotateY(${isMobile ? -10 : -16}deg)`;
                    card.style.zIndex = '5';
                    card.style.opacity = '0.84';
                    card.style.filter = 'brightness(0.92)';
                    card.style.pointerEvents = 'auto';
                } else if (offset === -2) {
                    const tx = isMobile ? -112 : isTablet ? -132 : -152;
                    card.style.transform = isPhone
                        ? `translateX(${tx}%) scale(.58)`
                        : `translateX(${tx}%) translateZ(-110px) scale(${isMobile ? 0.68 : 0.76}) rotateY(${isMobile ? 18 : 28}deg)`;
                    card.style.zIndex = '2';
                    card.style.opacity = isMobile ? '0.35' : '0.55';
                    card.style.filter = 'brightness(0.75)';
                    card.style.pointerEvents = 'auto';
                } else if (offset === 2) {
                    const tx = isMobile ? 112 : isTablet ? 132 : 152;
                    card.style.transform = isPhone
                        ? `translateX(${tx}%) scale(.58)`
                        : `translateX(${tx}%) translateZ(-110px) scale(${isMobile ? 0.68 : 0.76}) rotateY(${isMobile ? -18 : -28}deg)`;
                    card.style.zIndex = '2';
                    card.style.opacity = isMobile ? '0.35' : '0.55';
                    card.style.filter = 'brightness(0.75)';
                    card.style.pointerEvents = 'auto';
                }
            });

            // Update bottom dots
            dots.forEach((dot, idx) => {
                if (idx === activeIndex) {
                    dot.classList.add('is-active');
                    dot.setAttribute('aria-selected', 'true');
                } else {
                    dot.classList.remove('is-active');
                    dot.setAttribute('aria-selected', 'false');
                }
            });
        };

        const goToSlide = (index) => {
            activeIndex = ((index % 5) + 5) % 5;
            updateCoverflow();
            startAutoSlide(); // Reset auto-slide interval on manual trigger
        };

        const nextSlide = () => goToSlide(activeIndex + 1);
        const prevSlide = () => goToSlide(activeIndex - 1);

        // Auto-Slide Loop (1 by 1 every 3.2s)
        const startAutoSlide = () => {
            stopAutoSlide();
            if (reduceMotion) return;
            autoSlideTimer = setInterval(() => {
                if (!isPaused) {
                    activeIndex = (activeIndex + 1) % 5;
                    updateCoverflow();
                }
            }, 3200);
        };

        const stopAutoSlide = () => {
            if (autoSlideTimer) clearInterval(autoSlideTimer);
        };

        // Pause only when hovering over active CTA button or favorite button
        deck.querySelectorAll('.coverflow-cta-btn, .coverflow-fav-btn').forEach((btn) => {
            btn.addEventListener('mouseenter', () => { isPaused = true; });
            btn.addEventListener('mouseleave', () => { isPaused = false; });
        });

        // Arrow Buttons
        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); prevSlide(); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); nextSlide(); });

        // Click Any Card to Slide 1-by-1 to Center
        cards.forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.coverflow-fav-btn') || e.target.closest('a')) return;
                if (index !== activeIndex) {
                    e.preventDefault();
                    goToSlide(index);
                }
            });
        });

        // Favorite Buttons
        $$('.coverflow-fav-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.classList.toggle('is-active');
            });
        });

        // Pagination Dots Click
        dots.forEach((dot, idx) => {
            dot.addEventListener('click', () => goToSlide(idx));
        });

        // Touch Swipe Handling
        let touchStartX = 0;
        let touchEndX = 0;

        deck.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            isPaused = true;
        }, { passive: true });

        deck.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            isPaused = false;
            if (touchStartX - touchEndX > 45) {
                nextSlide();
            } else if (touchEndX - touchStartX > 45) {
                prevSlide();
            }
        }, { passive: true });

        // Keyboard Arrow Keys (when visible)
        window.addEventListener('keydown', (e) => {
            if (!section) return;
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                if (e.key === 'ArrowLeft') prevSlide();
                if (e.key === 'ArrowRight') nextSlide();
            }
        });

        window.addEventListener('resize', updateCoverflow, { passive: true });

        // Initialize
        updateCoverflow();
        startAutoSlide();
    };

    /* ---------- Shared influencer roster ---------- */
    const FEATURED_INFLUENCERS = [
        {
            name: 'Fukra Insaan',
            role: 'Digital Icon & Creator',
            handle: 'fukra_insaan',
            image: 'assets/gallery/fukra-insaan.jpg'
        },
        {
            name: 'Digvijay Rathee',
            role: 'Fitness & Reality Star',
            handle: 'digvijay_rathee',
            image: 'assets/gallery/digvijay-rathee.jpg'
        },
        {
            name: 'Sana Sultan',
            role: 'Actor & Fashion Star',
            handle: 'sanakhan00',
            image: 'assets/gallery/sana-sultan.jpg'
        },
        {
            name: 'Puneet Superstar',
            role: 'Viral Comedy Creator',
            handle: 'puneetsuperr_star',
            image: 'assets/talent/puneet-superstar.jpg'
        },
        {
            name: 'Shadab Jakati',
            role: 'Viral Comedy Creator',
            handle: 'shadabjakati1',
            image: 'assets/talent/shadab-jakati.jpg'
        },
        {
            name: 'Tanya Mittal',
            role: 'Actor & Digital Creator',
            handle: 'tanyamittalofficial',
            image: 'assets/talent/tanya-mittal.jpg'
        },
        {
            name: 'Shivani Gupta',
            role: 'Lifestyle & Travel Creator',
            handle: '___shivanigupta__',
            image: 'assets/talent/shivani-gupta.jpg'
        }
    ];

    const createTalentCard = (profile) => {
        const card = document.createElement('a');
        card.className = 'talent';
        card.href = `https://www.instagram.com/${profile.handle}/`;
        card.target = '_blank';
        card.rel = 'noopener';
        card.dataset.featuredInfluencer = profile.handle;

        const photo = document.createElement('span');
        photo.className = 'talent-photo';
        const image = document.createElement('img');
        image.src = profile.image;
        image.alt = profile.name;
        image.loading = 'lazy';
        photo.append(image);

        const body = document.createElement('span');
        body.className = 'talent-body';
        const role = document.createElement('span');
        role.className = 'talent-role';
        role.textContent = profile.role;
        const name = document.createElement('span');
        name.className = 'talent-name';
        name.textContent = profile.name;
        const handle = document.createElement('span');
        handle.className = 'talent-meta';
        handle.textContent = `@${profile.handle}`;
        body.append(role, name, handle);
        card.append(photo, body);
        return card;
    };

    const hydrateSharedInfluencerRosters = () => {
        const tracks = $$('.talent-marquee[aria-label="Influencers we work with"] .talent-track');

        tracks.forEach(track => {
            if (track.dataset.featuredReady === 'true') return;

            // Rebuild the duplicate half after adding the featured profiles so
            // both halves have the exact same order and the marquee stays seamless.
            $$('.talent[aria-hidden="true"]', track).forEach(card => card.remove());
            const firstExistingCard = $('.talent', track);
            const featuredCards = document.createDocumentFragment();
            FEATURED_INFLUENCERS.forEach(profile => featuredCards.append(createTalentCard(profile)));
            track.insertBefore(featuredCards, firstExistingCard);

            const profiles = $$('.talent:not([aria-hidden="true"])', track);
            profiles.forEach(profile => {
                const duplicate = profile.cloneNode(true);
                duplicate.setAttribute('aria-hidden', 'true');
                duplicate.tabIndex = -1;
                track.append(duplicate);
            });

            track.dataset.featuredReady = 'true';
        });
    };

    hydrateSharedInfluencerRosters();

    /* ---------- Home roster: categorized panoramic portrait walls ---------- */
    const initRosterPanorama = () => {
        const roster = $('#faces.roster-panorama');
        if (!roster || roster.dataset.panoramaReady === 'true') return;

        const tracks = $$('.talent-track', roster);
        if (!tracks.length) return;

        tracks.forEach(track => {
            const profiles = $$('.talent:not([aria-hidden="true"])', track);
            const allCards = $$('.talent', track);
            const total = profiles.length;
            if (!total) return;

            allCards.forEach((card, index) => {
                const position = index % total;
                const distance = Math.abs(position - ((total - 1) / 2));
                const edge = distance / Math.max((total - 1) / 2, 1);
                const direction = position < (total - 1) / 2 ? -1 : position > (total - 1) / 2 ? 1 : 0;
                const width = Math.round(190 + (edge * 62));
                const height = Math.round(314 + (edge * 96));
                const offset = Math.round(92 - (edge * 72));
                const rotation = Math.round(direction * (4 + (edge * 11)));

                card.style.setProperty('--pano-w', `${width}px`);
                card.style.setProperty('--pano-h', `${height}px`);
                card.style.setProperty('--pano-y', `${offset}px`);
                card.style.setProperty('--pano-r', `${rotation}deg`);
            });
        });

        roster.dataset.panoramaReady = 'true';
    };

    initRosterPanorama();
    initCoverflowSlider();
})();
