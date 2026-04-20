// public/js/ui-module.js
let chartPie = null;

export const UIModule = {
    updateCounters: function(data) {
        document.getElementById('total-arboles').innerText = data.totalArboles ?? 0;
        document.getElementById('total-especies').innerText = data.totalEspecies ?? 0;
        document.getElementById('total-sanos').innerText = data.totalSanos ?? 0;
    },

    renderChart: function(canvasId, totalArboles, totalSanos) {
        if(chartPie) chartPie.destroy();
        
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;

        const b = totalSanos ?? 0;
        const r = Math.floor(((totalArboles ?? 0) - b) / 2); 
        const m = (totalArboles ?? 0) - b - r;

        chartPie = new Chart(canvas, {
            type: 'doughnut',
            data: { 
                labels: ["Bueno", "Regular", "Malo"], 
                datasets: [{ data: [b, r, m], backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b'] }] 
            },
            options: { maintainAspectRatio: false, legend: { display: false }, cutoutPercentage: 80 }
        });
    },

    generatePDF: function(data) {
        const ticketElement = document.getElementById('ticketPDF');
        if (!ticketElement) {
            alert("Error: No se encontró el diseño del ticket.");
            return;
        }

        document.getElementById('ticket-folio').innerText = 'UTM-' + Date.now().toString().slice(-4);
        document.getElementById('ticket-fecha').innerText = new Date().toLocaleDateString();
        document.getElementById('ticket-total').innerText = data.totalArboles ?? 0;
        document.getElementById('ticket-sanos').innerText = data.totalSanos ?? 0;
        document.getElementById('ticket-riesgo').innerText = (data.totalArboles ?? 0) - (data.totalSanos ?? 0);
        
        const salud = (data.totalArboles > 0) ? Math.round(((data.totalSanos ?? 0) / data.totalArboles) * 100) : 0;
        document.getElementById('ticket-porcentaje').innerText = salud + '%';
        
        ticketElement.style.display = 'block';
        
        const opt = {
            margin:       10,
            filename:     'Ticket_ArboMap_Real.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a5', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(ticketElement).save().then(() => {
            ticketElement.style.display = 'none'; 
        });
    }
};