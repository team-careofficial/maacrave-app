import type { Point } from '../geo';

export type MapConfig =
  | { id: string; mode: 'route'; from: Point; to: Point; fromLabel: string; toLabel: string }
  | { id: string; mode: 'pick'; center: Point };

const KITCHEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18v2a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z"/><path d="M12 3c-1 1.2-1 2.3 0 3.5M8.5 4.5c-.8 1-.8 1.8 0 2.8M15.5 4.5c-.8 1-.8 1.8 0 2.8"/></svg>';
const HOME = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>';

/** Self-contained Leaflet page (CARTO Voyager basemap) used inside a WebView or iframe. */
export function mapHtml(cfg: MapConfig) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#m{margin:0;height:100%;background:#F1ECEA;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
.leaflet-container{background:#F1ECEA}
.pin{width:38px;height:38px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:grid;place-items:center;box-shadow:0 8px 18px -6px rgba(42,11,13,.55);border:3px solid #fff}
.pin>span{transform:rotate(45deg);display:grid;place-items:center}
.k{background:linear-gradient(135deg,#D8292F,#7C0E13)} .h{background:#231A1B}
.tag{position:absolute;left:44px;top:4px;white-space:nowrap;background:#fff;color:#1D1617;font-weight:700;font-size:12px;padding:4px 9px;border-radius:999px;box-shadow:0 6px 14px -8px rgba(0,0,0,.5)}
.center{position:absolute;left:50%;top:50%;z-index:500;transform:translate(-50%,-100%);pointer-events:none}
.dot{position:absolute;left:50%;top:50%;width:10px;height:5px;border-radius:50%;background:rgba(0,0,0,.25);transform:translate(-50%,-50%);z-index:499}
.leaflet-control-attribution{font-size:9px!important;opacity:.75}
</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var cfg=${JSON.stringify(cfg)};
function post(m){m.id=cfg.id;var s=JSON.stringify(m);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*');}
var still=cfg.mode==='route';
var map=L.map('m',{zoomControl:false,attributionControl:true,dragging:!still,touchZoom:!still,scrollWheelZoom:!still,doubleClickZoom:!still,boxZoom:false,keyboard:false,tap:!still});
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
function icon(cls,svg,label){return L.divIcon({className:'',iconSize:[38,38],iconAnchor:[19,38],html:'<div style="position:relative"><div class="pin '+cls+'"><span>'+svg+'</span></div>'+(label?'<div class="tag">'+label+'</div>':'')+'</div>'});}
if(cfg.mode==='route'){
  var a=[cfg.from.lat,cfg.from.lng],b=[cfg.to.lat,cfg.to.lng];
  var mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1];
  var c=[mx-dy*0.22,my+dx*0.22],pts=[];
  for(var i=0;i<=40;i++){var t=i/40,u=1-t;pts.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]]);}
  L.polyline(pts,{color:'#fff',weight:9,opacity:.95}).addTo(map);
  L.polyline(pts,{color:'#B0161C',weight:5,opacity:1,lineCap:'round'}).addTo(map);
  L.marker(a,{icon:icon('k',${JSON.stringify(KITCHEN)},cfg.fromLabel)}).addTo(map);
  L.marker(b,{icon:icon('h',${JSON.stringify(HOME)},cfg.toLabel)}).addTo(map);
  map.fitBounds(L.latLngBounds([a,b]).pad(0.45),{maxZoom:15});
}else{
  map.setView([cfg.center.lat,cfg.center.lng],16);
  var d=document.createElement('div');d.className='center';d.innerHTML='<div class="pin h"><span>${HOME.replace(/"/g, '\\"')}</span></div>';document.body.appendChild(d);
  var s=document.createElement('div');s.className='dot';document.body.appendChild(s);
  map.on('moveend',function(){var p=map.getCenter();post({lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6)});});
  window.addEventListener('message',function(e){try{var m=JSON.parse(e.data);if(m.id===cfg.id&&m.goto)map.setView([m.goto.lat,m.goto.lng],17);}catch(_){}});
  document.addEventListener('message',function(e){try{var m=JSON.parse(e.data);if(m.id===cfg.id&&m.goto)map.setView([m.goto.lat,m.goto.lng],17);}catch(_){}});
}
</script></body></html>`;
}
