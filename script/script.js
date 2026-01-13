document.addEventListener('DOMContentLoaded', () => {

    /* =========================================
       1. SWIPER SLIDER CONFIGURATION
       Handles the Hero Section carousel
       ========================================= */
    const swiperEl = document.querySelector('.mySwiper');
    if (swiperEl) {
        var swiper = new Swiper(".mySwiper", {
            loop: true,
            effect: "fade", // Smoother fade effect for hero images
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                dynamicBullets: true,
                clickable: true,
            },
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
        });
    }

    /* =========================================
       2. REAL-TIME CLOCK (Kigali Time)
       ========================================= */
    const timeDisplay = document.getElementById('current-time');
    
    function updateTime() {
        if(timeDisplay) {
            const now = new Date();
            // Format: 00:00 AM/PM
            const timeString = now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            timeDisplay.innerText = timeString;
        }
    }
    
    // Init clock immediately then update every second
    updateTime();
    setInterval(updateTime, 1000);


    /* =========================================
       3. DYNAMIC CONTENT SYSTEM (The "Git Pull")
       Fetches data committed by admin.html
       ========================================= */
    const adContainer = document.getElementById('adContainer');
    const DB_KEY_LIVE = 'adify_live_data';

    // A. Default Data (Fallback if Admin hasn't committed anything yet)
    const fallbackData = [
        { 
            id: 101,
            title: 'Kigali Jazz Junction', 
            img: 'https://images.unsplash.com/photo-1514525253361-bee8a48740ad?w=800', 
            desc: 'The season finale featuring top international jazz artists at the Camp Kigali tent.', 
            cat: 'Music', 
            price: '20,000 RWF' 
        },
        { 
            id: 102,
            title: 'Tour du Rwanda VIP', 
            img: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800', 
            desc: 'Exclusive finish-line access for the final stage at Rebero.', 
            cat: 'Sports', 
            price: 'Free Entry' 
        },
        { 
            id: 103,
            title: 'Comedy Knights', 
            img: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800', 
            desc: 'A night of laughter with the best comedians in East Africa.', 
            cat: 'Comedy', 
            price: '10,000 RWF' 
        }
    ];

    // B. Fetch Function
    function renderBroadcasts() {
        if (!adContainer) return;

        // 1. PULL: Try to get data from "Live" storage
        const storedData = localStorage.getItem(DB_KEY_LIVE);
        
        // 2. MERGE LOGIC: Use stored data if exists, otherwise use fallback
        const events = storedData ? JSON.parse(storedData) : fallbackData;

        // 3. Clear current DOM
        adContainer.innerHTML = '';

        // 4. RENDER LOOP
        events.forEach((event, index) => {
            // Stagger animation delay (0ms, 200ms, 400ms...)
            const delay = index * 150; 
            
            // Construct HTML Card
            const cardHTML = `
                <div class="group bg-emerald-800 rounded-[2rem] overflow-hidden shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-2 transition duration-500 animate__animated animate__fadeInUp" style="animation-delay: ${delay}ms">
                    <div class="h-56 overflow-hidden relative">
                        <img src="${event.img}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="${event.title}">
                        
                        <span class="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-emerald-900 px-4 py-1 text-xs font-black rounded-full uppercase tracking-wider shadow-lg">
                            ${event.cat}
                        </span>
                        
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-900 to-transparent p-4 pt-12">
                            <span class="text-yellow-400 font-bold text-lg drop-shadow-md">${event.price}</span>
                        </div>
                    </div>
                    
                    <div class="p-8">
                        <h3 class="text-2xl font-black leading-tight mb-3 text-white group-hover:text-emerald-300 transition-colors">${event.title}</h3>
                        <p class="text-emerald-200/80 text-sm mb-8 leading-relaxed line-clamp-2">${event.desc}</p>
                        
                        <div class="flex gap-4">
                            <button class="flex-1 bg-white text-emerald-900 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition shadow-lg">
                                Buy Ticket
                            </button>
                            <button class="w-12 h-12 flex items-center justify-center rounded-xl border border-emerald-600 text-emerald-400 hover:bg-emerald-700 hover:text-white transition">
                                <i class="far fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Inject into DOM
            adContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // Run the render function
    renderBroadcasts();

    // OPTIONAL: Listen for updates in other tabs (Instant Sync)
    // If Admin updates in one tab, this updates immediately without refresh
    window.addEventListener('storage', (e) => {
        if(e.key === DB_KEY_LIVE) {
            console.log('Update detected from Admin Panel... Refreshing content.');
            renderBroadcasts();
        }
    });

});