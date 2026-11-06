/* Native details remains a working menu when JavaScript is unavailable. */
(function(){
  'use strict';
  document.querySelectorAll('.ds-nav-menu').forEach(function(menu){
    var summary=menu.querySelector('summary');
    menu.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(){menu.open=false;});
    });
    document.addEventListener('click',function(event){
      if(menu.open&&!menu.contains(event.target))menu.open=false;
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&menu.open){menu.open=false;summary.focus();}
    });
    window.addEventListener('resize',function(){
      if(window.innerWidth>1100)menu.open=false;
    },{passive:true});
  });
})();
