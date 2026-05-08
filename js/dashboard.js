// ═══════════════════════════════════════════════════════════════
//  dashboard.js — Dashboard Stats, Chart, Recent Transactions
// ═══════════════════════════════════════════════════════════════

function countUp(elId, target, duration = 600) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('stat-pop');
    void el.offsetWidth;
    el.classList.add('stat-pop');
    const step = 16;
    const steps = duration / step;
    let frame = 0;
    const tick = () => {
        frame++;
        el.innerText = `Rp ${Math.round(target * (frame / steps)).toLocaleString()}`;
        if (frame < steps) requestAnimationFrame(tick);
        else el.innerText = `Rp ${target.toLocaleString()}`;
    };
    requestAnimationFrame(tick);
}

function refreshDashboard() {
    const today      = new Date().toISOString().split('T')[0];
    const todayTrans = transactions.filter(t =>
        t.dateISO ? t.dateISO === today : t.date.includes(new Date().toLocaleDateString('id-ID'))
    );
    const sales  = todayTrans.reduce((s, t) => s + t.total,  0);
    const profit = todayTrans.reduce((s, t) => s + t.profit, 0);

    countUp('statSales',  sales);
    countUp('statProfit', profit);
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    _renderRecent();
    _renderChart();
}

function _renderRecent() {
    const list   = document.getElementById('recentList');
    // FIX: sort by dateISO descending dulu sebelum ambil 3 teratas.
    // slice(-3) tidak reliable karena transaksi baru di-push ke akhir array,
    // sementara data lama dimuat sorted descending — hasilnya bisa tampil transaksi terlama.
    const recent = [...transactions]
        .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || '') || (b.id || '').localeCompare(a.id || ''))
        .slice(0, 3);

    if (recent.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-400 italic">Belum ada transaksi</p>';
        return;
    }

    list.innerHTML = recent.map(t => `
        <div class="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-100 card-shadow">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">TRX</div>
                <div>
                    <p class="text-xs font-black uppercase">${t.id}</p>
                    <p class="text-[9px] text-slate-400">${t.date}</p>
                </div>
            </div>
            <p class="font-black text-sm text-blue-600">Rp ${t.total.toLocaleString()}</p>
        </div>
    `).join('');
}

function _renderChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();

    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        const d    = new Date();
        d.setDate(d.getDate() - i);
        const dISO = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        data.push(
            transactions
                .filter(t => t.dateISO ? t.dateISO === dISO : t.date.includes(d.toLocaleDateString('id-ID')))
                .reduce((s, t) => s + t.total, 0)
        );
    }

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Penjualan', data,
                borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)',
                borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0,
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
            },
        },
    });
}
