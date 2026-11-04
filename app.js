const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
let busy = false;
const lock = async fn => { if(busy) return; busy = true; try{ await fn(); } finally{ busy = false; } };

document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  if(busy) return;
  document.querySelectorAll('.tab,.panel').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); $('#' + b.dataset.tab).classList.add('active');
});

// ---------- City data ----------
const places = [['Railway Station',70,190],['Hospital',200,80],['Market',210,200],['College',350,90],
                ['Park',370,230],['Airport',570,170],['Mall',220,320],['Stadium',500,310]];
// [from, to, distance km, construction cost lakh]
const roads = [[0,1,4,40],[0,2,2,20],[1,2,1,12],[1,3,5,55],[2,3,8,70],[2,4,6,48],[3,4,2,18],
               [3,5,6,60],[4,5,3,30],[2,6,3,25],[6,7,7,65],[4,7,5,42],[5,7,6,52]];

function drawMap(svg, idx, label){
  $(svg).innerHTML = roads.map((r,i) => {
    const [a,b] = [places[r[0]], places[r[1]]];
    return `<line id="${svg.slice(1)}e${i}" x1="${a[1]}" y1="${a[2]}" x2="${b[1]}" y2="${b[2]}"/>
            <text class="w" x="${(a[1]+b[1])/2}" y="${(a[2]+b[2])/2 - 5}" text-anchor="middle">${r[idx]}${label}</text>`;
  }).join('') + places.map((p,i) => `<circle id="${svg.slice(1)}n${i}" cx="${p[1]}" cy="${p[2]}" r="11"/>
    <text class="n" x="${p[1]}" y="${p[2]+27}" text-anchor="middle">${p[0]}</text>`).join('');
}
const node = (s,i) => $(`#${s}n${i}`), edge = (s,i) => $(`#${s}e${i}`);
const edgeId = (u,v) => roads.findIndex(r => (r[0]===u&&r[1]===v)||(r[0]===v&&r[1]===u));

// ---------- 1. Dijkstra : Route Finder ----------
places.forEach((p,i) => { $('#src').add(new Option(p[0], i)); $('#dst').add(new Option(p[0], i)); });
$('#dst').value = 5;
async function route(){
  drawMap('#map1', 2, ' km');
  const s = +$('#src').value, t = +$('#dst').value, n = places.length;
  const dist = Array(n).fill(Infinity), prev = Array(n).fill(null), done = Array(n).fill(false);
  dist[s] = 0;
  for(let k = 0; k < n; k++){
    let u = -1; for(let i = 0; i < n; i++) if(!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if(dist[u] === Infinity) break; done[u] = true;
    node('map1', u).classList.add('vis'); await sleep(450);
    if(u === t) break;
    roads.forEach(r => {
      const v = r[0] === u ? r[1] : r[1] === u ? r[0] : -1;
      if(v >= 0 && dist[u] + r[2] < dist[v]){ dist[v] = dist[u] + r[2]; prev[v] = u; }
    });
  }
  const path = []; for(let v = t; v !== null; v = prev[v]) path.unshift(v);
  for(let i = 0; i < path.length - 1; i++){ edge('map1', edgeId(path[i], path[i+1])).classList.add('path'); await sleep(300); }
  path.forEach(v => node('map1', v).classList.add('end'));
  $('#rstats').innerHTML = `Route: <b>${path.map(i => places[i][0]).join(' → ')}</b><br>Total distance: <b>${dist[t]} km</b> | Est. time at 30 km/h: <b>${(dist[t]/30*60).toFixed(0)} min</b>`;
}
$('#rgo').onclick = () => lock(route);

// ---------- 2. Kruskal : Road Network ----------
function resetNet(){ drawMap('#map2', 3, 'L'); $('#nstats').textContent = 'Connect every zone at minimum cost (edge label = cost in lakh).'; }
async function network(){
  resetNet();
  const p = places.map((_,i) => i), find = x => p[x] === x ? x : (p[x] = find(p[x]));
  let total = 0, count = 0, log = [];
  const order = roads.map((r,i) => ({r,i})).sort((a,b) => a.r[3] - b.r[3]);
  for(const {r,i} of order){
    const ln = edge('map2', i); ln.style.stroke = '#facc15'; await sleep(550);
    const a = find(r[0]), b = find(r[1]);
    ln.style.stroke = '';
    if(a !== b){ p[a] = b; total += r[3]; count++; ln.classList.add('ok'); log.push(`${places[r[0]][0]} – ${places[r[1]][0]} (${r[3]}L)`); }
    else ln.classList.add('no');
    $('#nstats').textContent = `Roads built: ${count}/${places.length-1} | Cost so far: ${total} lakh`;
    if(count === places.length - 1) break;
  }
  places.forEach((_,i) => node('map2', i).classList.add('end'));
  const all = roads.reduce((s,r) => s + r[3], 0);
  $('#nstats').innerHTML = `Minimum network cost: <b>${total} lakh</b><br>Building all roads: ${all} lakh → <b>saving ${all-total} lakh (${((all-total)/all*100).toFixed(0)}%)</b><br>Roads: ${log.join(', ')}`;
}
$('#ngo').onclick = () => lock(network);
$('#nrst').onclick = () => !busy && resetNet();
resetNet(); drawMap('#map1', 2, ' km');

// ---------- 3. Bubble vs Merge : Delivery Scheduler ----------
let cmpB = 0, cmpM = 0;
function bubble(a){ a = a.slice(); for(let i = 0; i < a.length-1; i++){ let sw = false;
  for(let j = 0; j < a.length-i-1; j++){ cmpB++; if(a[j].t > a[j+1].t){ [a[j],a[j+1]] = [a[j+1],a[j]]; sw = true; } }
  if(!sw) break; } return a; }
function merge(a){
  if(a.length < 2) return a;
  const m = a.length >> 1, L = merge(a.slice(0,m)), R = merge(a.slice(m)), out = []; let i = 0, j = 0;
  while(i < L.length && j < R.length){ cmpM++; out.push(L[i].t <= R[j].t ? L[i++] : R[j++]); }
  return out.concat(L.slice(i), R.slice(j));
}
function deliveries(){
  const n = Math.min(8000, Math.max(10, +$('#dn').value)), zones = places.map(p => p[0]);
  const data = Array.from({length: n}, (_,i) => ({id: 1000+i, t: 10 + Math.random()*170 | 0, z: zones[Math.random()*zones.length | 0]}));
  cmpB = cmpM = 0;
  let t0 = performance.now(); const sb = bubble(data); const tb = performance.now() - t0;
  t0 = performance.now(); const sm = merge(data); const tm = performance.now() - t0;
  const max = Math.max(cmpB, cmpM);
  $('#dres').innerHTML = `
    <div class="bar b1" style="width:100%">Bubble Sort: ${cmpB.toLocaleString()} comparisons · ${tb.toFixed(1)} ms</div>
    <div class="bar b2" style="width:${Math.max(4, cmpM/max*100)}%">Merge Sort: ${cmpM.toLocaleString()} cmp · ${tm.toFixed(1)} ms</div>
    <div class="stats">${n} deliveries sorted by time. Merge Sort used <b>${(cmpB/cmpM).toFixed(0)}x fewer comparisons</b>. Same result: <b>${sb.every((x,i) => x.t === sm[i].t)}</b></div>
    <table><tr><th>Priority</th><th>Order ID</th><th>Destination</th><th>Time (min)</th></tr>
    ${sm.slice(0,8).map((d,i) => `<tr><td>${i+1}</td><td>#${d.id}</td><td>${d.z}</td><td>${d.t}</td></tr>`).join('')}</table>`;
}
$('#dgo').onclick = () => { $('#dres').textContent = 'Sorting...'; setTimeout(deliveries, 30); };

// ---------- 4. Knapsack : Project Budget ----------
const projects = [['Metro Line',10,60],['Solar Street Lights',4,25],['Smart Hospital',6,50],
                  ['Public Wi-Fi',3,20],['Water Treatment Plant',5,40],['City Park',2,15],['Smart Traffic Signals',4,30]];
const renderProjects = sel => $('#plist').innerHTML = projects.map((p,i) =>
  `<div class="card ${sel.includes(i) ? 'sel' : ''}"><b>${sel.includes(i) ? '✅ ' : ''}${p[0]}</b>Cost: ${p[1]} cr<br>Benefit: ${p[2]}</div>`).join('');
function knapsack(){
  const W = Math.min(40, Math.max(1, +$('#bud').value)), n = projects.length;
  const dp = Array.from({length: n+1}, () => Array(W+1).fill(0));
  for(let i = 1; i <= n; i++) for(let w = 0; w <= W; w++){
    dp[i][w] = dp[i-1][w]; const [,c,b] = projects[i-1];
    if(c <= w) dp[i][w] = Math.max(dp[i][w], b + dp[i-1][w-c]);
  }
  let w = W; const sel = [];
  for(let i = n; i > 0; i--) if(dp[i][w] !== dp[i-1][w]){ sel.push(i-1); w -= projects[i-1][1]; }
  renderProjects(sel);
  const cost = sel.reduce((s,i) => s + projects[i][1], 0);
  $('#pstats').innerHTML = `Selected: <b>${sel.map(i => projects[i][0]).reverse().join(', ') || 'none'}</b><br>
    Cost used: <b>${cost}/${W} crore</b> | Maximum citizen benefit: <b>${dp[n][W]}</b>`;
}
$('#pgo').onclick = knapsack;
renderProjects([]);
