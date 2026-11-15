(function(){var d=document,h=d.documentElement,b=d.querySelector('.menu'),n=d.getElementById('nav'),t=d.getElementById('theme');
if(b&&n){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)})}
function cur(){return h.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
if(t){t.setAttribute('aria-label',h.lang=='id'?'Ganti tema terang atau gelap':'Switch light or dark theme');
t.addEventListener('click',function(){var x=cur()=='dark'?'light':'dark';h.dataset.theme=x;try{localStorage.setItem('theme',x)}catch(e){}})}
var y=d.getElementById('yr');if(y)y.textContent=new Date().getFullYear()})();
