(function(){
var $=function(i){return document.getElementById(i)},T=window.T||{};
function f(s,o){for(var k in o)s=s.replace('{'+k+'}',o[k]);return s}
function li(a){return '<ul>'+a.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>'}
if($('nm')){$('nm-go').addEventListener('click',function(){
 var n=$('nm').value.trim().toLowerCase().replace(/\.[a-z.]+$/,''),s=100,t=[];
 if(!n){$('nm-out').textContent=T.empty;return}
 var L=n.replace(/[^a-z0-9-]/g,'').length;
 if(L>12){s-=Math.min(30,(L-12)*5);t.push(f(T.lenLong,{n:L}))}else t.push(f(T.lenOk,{n:L}));
 if(/-/.test(n)){s-=20;t.push(T.hyph)}
 if(/[0-9]/.test(n)){s-=15;t.push(T.digit)}
 var v=(n.match(/[aiueo]/g)||[]).length,r=v/Math.max(L,1);
 if(r<.25){s-=15;t.push(T.vowLow)}else if(r>.65){s-=8;t.push(T.vowHigh)}
 if(/(.)\1\1/.test(n)){s-=10;t.push(T.tri)}
 if(/[^a-z0-9-]/.test(n)){s-=20;t.push(T.bad)}
 s=Math.max(0,s);$('nm-out').innerHTML='<div class="score">'+s+'/100</div>'+li(t)+'<p class="meta">'+T.note+'</p>'});}
if($('c1')){$('c-go').addEventListener('click',function(){
 var a=+$('c1').value,b=+$('c2').value,y=Math.max(1,+$('c3').value||1),tot=a+b*(y-1),m=function(x){return 'Rp'+Math.round(x).toLocaleString(T.loc)};
 if(!(a>=0&&b>=0)){$('c-out').textContent=T.numErr;return}
 $('c-out').innerHTML='<div class="score">'+m(tot)+'</div>'+li([f(T.total,{y:y}),f(T.avg,{v:m(tot/y)}),b>a*2?T.warn:T.ok])});}
})();
