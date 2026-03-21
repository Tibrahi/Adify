document.addEventListener('DOMContentLoaded', () => {
    // ────────────────────────────────────────────────
    // 1. Swiper Configuration (Hero Slider)
    // ────────────────────────────────────────────────
    const swiperEl = document.querySelector('.mySwiper');
    if (swiperEl) {
        new Swiper(swiperEl, {
            loop: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            autoplay: {
                delay: 5200,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            pagination: {
                el: '.swiper-pagination',
                dynamicBullets: true,
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            preloadImages: false,
            lazy: true,
        });
    }

    // ────────────────────────────────────────────────
    // 2. Real-time Kigali Clock (CAT = Africa/Kigali)
    // ────────────────────────────────────────────────
    const timeDisplay = document.getElementById('current-time');

    const updateTime = () => {
        if (!timeDisplay) return;
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString('en-GB', {
            timeZone: 'Africa/Kigali',
            hour: '2-digit',
            minute: '2-digit',
            // second: '2-digit',   // uncomment if you want seconds
        });
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    // ────────────────────────────────────────────────
    // 3. Dynamic Broadcasts System ("Live Data Pull")
    // ────────────────────────────────────────────────
    const adContainer = document.getElementById('adContainer');
    const DB_KEY = 'adify_live_data';

    // Fallback data (used when no stored data exists)
    const fallbackEvents = [
        {
            id: 101,
            title: 'Kigali Jazz Junction',
            img: 'https://images.unsplash.com/photo-1514525253361-bee8a48740ad?w=800&auto=format&fit=crop',
            desc: 'Season finale with international jazz stars at Camp Kigali tent.',
            cat: 'Music',
            price: '20,000 RWF',
        },
        {
            id: 102,
            title: 'Tour du Rwanda VIP',
            img: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop',
            desc: 'Exclusive finish-line VIP access – Rebero final stage.',
            cat: 'Sports',
            price: 'Free Entry',
        },
        {
            id: 103,
            title: 'Comedy Knights',
            img: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&auto=format&fit=crop',
            desc: 'East Africa’s funniest comedians live on one unforgettable night.',
            cat: 'Comedy',
            price: '10,000 RWF',
        },
    ];

    /**
     * Renders all broadcast cards efficiently using DocumentFragment
     * @param {Array} events
     */
    const renderBroadcasts = (events) => {
        if (!adContainer) return;

        const fragment = document.createDocumentFragment();

        events.forEach((event, index) => {
            const delay = index * 120;

            const card = document.createElement('div');
            card.className = `group bg-emerald-800 rounded-[2rem] overflow-hidden shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-2 transition duration-500 animate__animated animate__fadeInUp`;
            card.style.animationDelay = `${delay}ms`;

            card.innerHTML = `
                <div class="h-56 overflow-hidden relative">
                    <img src="${event.img}" 
                         class="w-full h-full object-cover group-hover:scale-110 transition duration-700" 
                         alt="${event.title}" 
                         loading="lazy">
                    
                    <span class="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-emerald-900 px-4 py-1 text-xs font-black rounded-full uppercase tracking-wider shadow-lg">
                        ${event.cat}
                    </span>
                    
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-900 to-transparent p-4 pt-12">
                        <span class="text-yellow-400 font-bold text-lg drop-shadow-md">${event.price}</span>
                    </div>
                </div>
                
                <div class="p-8">
                    <h3 class="text-2xl font-black leading-tight mb-3 text-white group-hover:text-emerald-300 transition-colors">
                        ${event.title}
                    </h3>
                    <p class="text-emerald-200/80 text-sm mb-8 leading-relaxed line-clamp-3">
                        ${event.desc}
                    </p>
                    
                    <div class="flex gap-4">
                        <button class="flex-1 bg-white text-emerald-900 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition shadow-lg"
                                aria-label="Buy ticket for ${event.title}">
                            Buy Ticket
                        </button>
                        <button class="w-12 h-12 flex items-center justify-center rounded-xl border border-emerald-600 text-emerald-400 hover:bg-emerald-700 hover:text-white transition"
                                aria-label="Add ${event.title} to favorites">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        adContainer.innerHTML = '';
        adContainer.appendChild(fragment);
    };

    /**
     * Load and render events – prefers stored data, falls back gracefully
     */
    const loadAndRender = () => {
        try {
            const stored = localStorage.getItem(DB_KEY);
            const data = stored ? JSON.parse(stored) : fallbackEvents;

            // Basic validation
            if (!Array.isArray(data) || data.length === 0) {
                console.warn('Invalid or empty stored data → using fallback');
                renderBroadcasts(fallbackEvents);
                return;
            }

            renderBroadcasts(data);
        } catch (err) {
            console.error('Failed to parse live events data:', err);
            renderBroadcasts(fallbackEvents);
        }
    };

    // Initial render
    loadAndRender();

    // ────────────────────────────────────────────────
    // 4. Cross-tab / cross-window live updates
    // ────────────────────────────────────────────────
    let debounceTimer = null;

    window.addEventListener('storage', (e) => {
        if (e.key !== DB_KEY) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log('[Adify] Live data updated from another tab — refreshing...');
            loadAndRender();
        }, 300); // debounce rapid successive changes
    });

    // Optional: Cleanup on unload (good practice)
    window.addEventListener('beforeunload', () => {
        clearInterval(clockInterval);
    });

    console.log('%cAdify Live System Ready • Modernized 2026', 'color:#10b981; font-weight:bold');
});