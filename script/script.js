document.addEventListener('DOMContentLoaded', () => {
    const noticeGrid = document.getElementById('noticeGrid');

    // These are the "Ads/Alerts" for the fans
    const fanNotices = [
        {
            type: "Concert Alert",
            star: "The Weeknd",
            title: "Stadium Tour: Additional Tickets Released!",
            content: "Due to high demand, a limited batch of tickets for the London and Paris shows has just been added.",
            time: "2 mins ago",
            icon: "fa-ticket-alt",
            color: "text-blue-600",
            img: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500"
        },
        {
            type: "Exclusive Drop",
            star: "Billie Eilish",
            title: "Signed Vinyl Pre-Order Available",
            content: "Check the official shop now. Only 500 copies available worldwide for the new 'Eco-Mix' edition.",
            time: "1 hour ago",
            icon: "fa-compact-disc",
            color: "text-purple-600",
            img: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500"
        },
        {
            type: "Fan Meet",
            star: "Dua Lipa",
            title: "Virtual Q&A Session Starting Soon",
            content: "Join the official Discord channel at 6 PM EST for a live chat and surprise announcement.",
            time: "Just Now",
            icon: "fa-video",
            color: "text-green-600",
            img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500"
        },
        {
            type: "Event Info",
            star: "Post Malone",
            title: "Rescheduled Tour Dates",
            content: "The November shows in California have been moved to January 2026. All tickets remain valid.",
            time: "3 hours ago",
            icon: "fa-calendar-alt",
            color: "text-orange-600",
            img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500"
        }
    ];

    function renderNotices() {
        noticeGrid.innerHTML = fanNotices.map(ad => `
            <div class="notice-card">
                <div class="relative h-48">
                    <img src="${ad.img}" class="w-full h-full object-cover" alt="event">
                    <div class="badge-new animate-pulse">New Update</div>
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <i class="fas ${ad.icon} ${ad.color}"></i>
                        <span class="text-xs font-black uppercase tracking-widest text-slate-400">${ad.type}</span>
                    </div>
                    <h3 class="text-xl font-black mb-2 uppercase tracking-tight leading-tight">${ad.title}</h3>
                    <p class="text-slate-600 text-sm mb-6">${ad.content}</p>
                    <div class="flex justify-between items-center mt-auto border-t border-slate-100 pt-4">
                        <span class="font-bold text-sm">Star: ${ad.star}</span>
                        <span class="text-xs text-slate-400 italic">${ad.time}</span>
                    </div>
                    <button class="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderNotices();
});