document.addEventListener('DOMContentLoaded', () => {
    const rwandaAds = [
        {
            title: "Kigali Jazz Junction",
            star: "Local & International Stars",
            desc: "The biggest monthly music event in Kigali is back! Join us for a night of soul, jazz, and rhythm.",
            price: "RWF 15,000+",
            date: "Last Friday of the Month",
            img: "https://images.unsplash.com/photo-1514525253361-bee8a48740ad?w=500",
            tag: "Concert"
        },
        {
            title: "Kwita Izina 2026",
            star: "Conservation Heroes",
            desc: "Official Naming Ceremony for the new baby gorillas in Volcanoes National Park. Be part of history.",
            price: "Free Admission",
            date: "September 2026",
            img: "https://images.unsplash.com/photo-1581281863883-2469417a1668?w=500",
            tag: "Culture"
        },
        {
            title: "BAL Finals @ BK Arena",
            star: "Basketball Africa League",
            desc: "Catch the finals of the Basketball Africa League live in the heart of Kigali. High energy guaranteed!",
            price: "RWF 5,000+",
            date: "May 2026",
            img: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500",
            tag: "Sports"
        },
        {
            title: "Visit Rwanda - Canopy Walk",
            star: "Nyungwe National Park",
            desc: "Exclusive fan discount for weekend trips to Nyungwe. Experience the 70m high canopy walk.",
            price: "30% OFF for Locals",
            date: "Daily",
            img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500",
            tag: "Tourism"
        }
    ];

    const container = document.getElementById('rwandaAds');
    container.innerHTML = rwandaAds.map(ad => `
        <div class="ad-card">
            <div class="relative h-56">
                <img src="${ad.img}" class="w-full h-full object-cover">
                <span class="absolute bottom-4 left-4 bg-yellow-400 text-emerald-900 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    ${ad.tag}
                </span>
            </div>
            <div class="p-8">
                <p class="text-emerald-700 text-xs font-bold uppercase mb-2 tracking-widest">${ad.star}</p>
                <h3 class="text-2xl font-black text-slate-900 mb-3">${ad.title}</h3>
                <p class="text-slate-500 text-sm mb-6 leading-relaxed">${ad.desc}</p>
                <div class="flex justify-between items-center border-t border-stone-100 pt-6 mt-auto">
                    <div>
                        <p class="text-[10px] text-stone-400 uppercase font-bold">Starts From</p>
                        <p class="text-emerald-700 font-black">${ad.price}</p>
                    </div>
                    <button class="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition">
                        Get Alert
                    </button>
                </div>
            </div>
        </div>
    `).join('');
});