(function(){var b=document.querySelector('.menu'),n=document.getElementById('nav');
if(b&&n){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)})}
var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear()})();
