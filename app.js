// Local State Initialization
let cash = parseFloat(localStorage.getItem('apex_cash')) || 100000.0;
let holdings = JSON.parse(localStorage.getItem('apex_holdings')) || [];
let orders = JSON.parse(localStorage.getItem('apex_orders')) || [];
let activeStock = null;
let modalMode = 'BUY';

// Chart State
let chart = null;
let candleSeries = null;
let currentCandle = null;

// Available Stocks Catalog
const stocks = [
  { id: 'TATASTEEL', name: 'Tata Steel Ltd', price: 142.30, change: 1.15 },
  { id: 'INFY', name: 'Infosys Ltd', price: 1845.50, change: -0.45 },
  { id: 'RELIANCE', name: 'Reliance Industries', price: 2980.00, change: 0.85 },
  { id: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1680.10, change: -1.20 },
  { id: 'ITC', name: 'ITC Ltd', price: 472.60, change: 0.30 },
  { id: 'TCS', name: 'Tata Consultancy Services', price: 4120.00, change: -0.15 },
  { id: 'SBIN', name: 'State Bank of India', price: 815.40, change: 1.80 }
];

function saveState() {
  localStorage.setItem('apex_cash', cash.toString());
  localStorage.setItem('apex_holdings', JSON.stringify(holdings));
  localStorage.setItem('apex_orders', JSON.stringify(orders));
  document.getElementById('cash-balance').innerText = `₹${cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// Watchlist Filter & Render
function filterStocks() {
  renderWatchlist();
}

function renderWatchlist() {
  const container = document.getElementById('stock-list-container');
  const query = (document.getElementById('search-input').value || '').toUpperCase();
  container.innerHTML = '';

  stocks
    .filter(s => s.id.includes(query) || s.name.toUpperCase().includes(query))
    .forEach(stk => {
      const isUp = stk.change >= 0;
      const li = document.createElement('li');
      li.className = `stock-row ${activeStock && activeStock.id === stk.id ? 'active' : ''}`;
      li.onclick = () => selectStock(stk);
      li.innerHTML = `
        <div>
          <div class="stock-symbol">${stk.id}</div>
          <div class="stock-exchange">${stk.name}</div>
        </div>
        <div class="stock-price-box">
          <div class="stock-price ${isUp ? 'up' : 'down'}">₹${stk.price.toFixed(2)}</div>
          <div class="stock-change ${isUp ? 'up' : 'down'}">
            ${isUp ? '▲' : '▼'} ${Math.abs(stk.change).toFixed(2)}%
          </div>
        </div>
      `;
      container.appendChild(li);
    });
}

// TradingView Lightweight Charts
function initChart() {
  const el = document.getElementById('tv-chart');
  el.innerHTML = '';

  chart = LightweightCharts.createChart(el, {
    layout: { background: { color: '#1c1c1c' }, textColor: '#888888' },
    grid: { vertLines: { color: '#252525' }, horzLines: { color: '#252525' } },
    crosshair: { mode: 0 },
    timeScale: { borderColor: '#2a2a2a', timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: '#2a2a2a' }
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#4caf50',
    downColor: '#df514c',
    borderVisible: false,
    wickUpColor: '#4caf50',
    wickDownColor: '#df514c'
  });

  window.addEventListener('resize', () => {
    if (chart && el) chart.applyOptions({ width: el.clientWidth });
  });
}

function generateCandles(basePrice) {
  const list = [];
  let time = Math.floor(Date.now() / 1000) - 60 * 35;
  let curr = basePrice * 0.98;

  for (let i = 0; i < 35; i++) {
    const open = curr;
    const close = open + (Math.random() - 0.49) * (open * 0.003);
    const high = Math.max(open, close) + Math.random() * (open * 0.0015);
    const low = Math.min(open, close) - Math.random() * (open * 0.0015);
    list.push({ time: time + (i * 60), open, high, low, close });
    curr = close;
  }
  currentCandle = list[list.length - 1];
  return list;
}

function selectStock(stk) {
  activeStock = stk;
  document.getElementById('chart-symbol').innerText = stk.id;
  document.getElementById('chart-price').innerText = `₹${stk.price.toFixed(2)}`;
  
  const changeEl = document.getElementById('chart-change');
  const isUp = stk.change >= 0;
  changeEl.className = isUp ? 'up' : 'down';
  changeEl.innerText = `${isUp ? '+' : ''}${stk.change.toFixed(2)}%`;

  const data = generateCandles(stk.price);
  candleSeries.setData(data);
  chart.timeScale().fitContent();
  renderWatchlist();
}

// Navigation Tabs
function switchTab(type) {
  document.getElementById('tab-holdings').classList.toggle('active', type === 'holdings');
  document.getElementById('tab-orders').classList.toggle('active', type === 'orders');
  document.getElementById('view-holdings').style.display = type === 'holdings' ? 'block' : 'none';
  document.getElementById('view-orders').style.display = type === 'orders' ? 'block' : 'none';
}

// Render Holdings & Orders
function renderHoldings() {
  const tbody = document.getElementById('holdings-container');
  tbody.innerHTML = '';
  let sumPnl = 0;

  if (holdings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No stocks held. Buy from the chart or watchlist.</td></tr>`;
    document.getElementById('total-pnl').innerText = '₹0.00';
    document.getElementById('total-pnl').className = '';
    return;
  }

  holdings.forEach((h, idx) => {
    const stk = stocks.find(s => s.id === h.symbol) || { price: h.avgPrice };
    const curVal = stk.price * h.qty;
    const invested = h.avgPrice * h.qty;
    const pnl = curVal - invested;
    sumPnl += pnl;
    const isUp = pnl >= 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${h.symbol}</td>
      <td>${h.qty}</td>
      <td>₹${h.avgPrice.toFixed(2)}</td>
      <td>₹${stk.price.toFixed(2)}</td>
      <td>₹${curVal.toFixed(2)}</td>
      <td class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}₹${pnl.toFixed(2)}</td>
      <td><button class="btn btn-sell" style="padding: 4px 8px; font-size: 0.72rem;" onclick="exitPosition(${idx})">Exit</button></td>
    `;
    tbody.appendChild(tr);
  });

  const pnlEl = document.getElementById('total-pnl');
  pnlEl.innerText = `${sumPnl >= 0 ? '+' : ''}₹${sumPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  pnlEl.className = sumPnl >= 0 ? 'up' : 'down';
}

function renderOrders() {
  const tbody = document.getElementById('orders-container');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No trades executed yet.</td></tr>`;
    return;
  }

  orders.slice().reverse().forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--text-muted);">${o.time}</td>
      <td style="font-weight: 600;" class="${o.type === 'BUY' ? 'up' : 'down'}">${o.type}</td>
      <td style="font-weight: 600;">${o.symbol}</td>
      <td>${o.qty}</td>
      <td>₹${o.price.toFixed(2)}</td>
      <td style="color: var(--green);">${o.status}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Modal & Order Actions
function openOrderModal(mode) {
  modalMode = mode;
  document.getElementById('modal-symbol').innerText = activeStock.id;
  document.getElementById('order-price').value = activeStock.price.toFixed(2);
  document.getElementById('order-qty').value = 1;
  
  const submitBtn = document.getElementById('modal-submit-btn');
  submitBtn.className = `btn ${mode === 'BUY' ? 'btn-buy' : 'btn-sell'}`;
  submitBtn.innerText = `${mode} ${activeStock.id}`;

  updateMarginRequired();
  document.getElementById('order-modal').classList.add('open');
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.remove('open');
}

function updateMarginRequired() {
  const qty = parseInt(document.getElementById('order-qty').value) || 0;
  const total = qty * (activeStock ? activeStock.price : 0);
  document.getElementById('margin-val').innerText = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function executeCurrentOrder() {
  const qty = parseInt(document.getElementById('order-qty').value);
  if (!qty || qty <= 0) return alert('Enter a valid quantity.');

  const cost = qty * activeStock.price;

  if (modalMode === 'BUY') {
    if (cash < cost) return alert('Insufficient available margin.');
    cash -= cost;

    const pos = holdings.find(h => h.symbol === activeStock.id);
    if (pos) {
      const totalQty = pos.qty + qty;
      pos.avgPrice = ((pos.avgPrice * pos.qty) + cost) / totalQty;
      pos.qty = totalQty;
    } else {
      holdings.push({ symbol: activeStock.id, qty: qty, avgPrice: activeStock.price });
    }
  } else {
    const posIndex = holdings.findIndex(h => h.symbol === activeStock.id);
    if (posIndex === -1 || holdings[posIndex].qty < qty) {
      return alert('Not enough quantity to sell.');
    }

    cash += cost;
    holdings[posIndex].qty -= qty;
    if (holdings[posIndex].qty === 0) holdings.splice(posIndex, 1);
  }

  orders.push({
    time: new Date().toLocaleTimeString(),
    type: modalMode,
    symbol: activeStock.id,
    qty: qty,
    price: activeStock.price,
    status: 'COMPLETE'
  });

  saveState();
  renderHoldings();
  renderOrders();
  closeOrderModal();
}

function exitPosition(idx) {
  const h = holdings[idx];
  const stk = stocks.find(s => s.id === h.symbol) || { price: h.avgPrice };
  cash += (stk.price * h.qty);

  orders.push({
    time: new Date().toLocaleTimeString(),
    type: 'SELL',
    symbol: h.symbol,
    qty: h.qty,
    price: stk.price,
    status: 'COMPLETE'
  });

  holdings.splice(idx, 1);
  saveState();
  renderHoldings();
  renderOrders();
}

// Live Candle & Price Ticks
setInterval(() => {
  stocks.forEach(s => {
    const delta = (Math.random() - 0.495) * (s.price * 0.002);
    s.price = Math.max(1, s.price + delta);
  });

  if (activeStock && currentCandle && candleSeries) {
    document.getElementById('chart-price').innerText = `₹${activeStock.price.toFixed(2)}`;
    currentCandle.close = activeStock.price;
    currentCandle.high = Math.max(currentCandle.high, activeStock.price);
    currentCandle.low = Math.min(currentCandle.low, activeStock.price);
    candleSeries.update(currentCandle);
  }

  renderWatchlist();
  renderHoldings();
}, 1800);

// App Boot
window.onload = () => {
  saveState();
  initChart();
  selectStock(stocks[0]);
  renderHoldings();
  renderOrders();
};
    
