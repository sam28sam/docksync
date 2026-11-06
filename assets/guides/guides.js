(function(){
  'use strict';
  var nav=document.getElementById('nav');
  if(nav){
    var updateNav=function(){nav.classList.toggle('sc',window.scrollY>8);};
    updateNav();
    window.addEventListener('scroll',updateNav,{passive:true});
  }

  var calculator=document.querySelector('[data-booking-calculator]');
  if(!calculator)return;
  var fields=Array.from(calculator.querySelectorAll('input'));
  var outputs={
    hours:document.getElementById('calc-hours'),
    weekly:document.getElementById('calc-weekly'),
    annual:document.getElementById('calc-annual')
  };
  var message=document.getElementById('calc-message');
  var wholeMoney=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0});
  var decimalMoney=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2});
  var hours=new Intl.NumberFormat('en-GB',{maximumFractionDigits:2});
  var roundMoney=function(value){return Math.round((value+Number.EPSILON)*100)/100;};
  var formatMoney=function(value){var rounded=roundMoney(value);return (Number.isInteger(rounded)?wholeMoney:decimalMoney).format(rounded);};
  function calculate(){
    var valid=true;
    var numbers=fields.map(function(input){
      var number=input.value.trim()===''?NaN:Number(input.value);
      var acceptable=Number.isFinite(number)&&input.validity.valid&&number>=0;
      input.setAttribute('aria-invalid',String(!acceptable));
      if(!acceptable)valid=false;
      return number;
    });
    if(!valid){
      Object.keys(outputs).forEach(function(key){outputs[key].textContent='—';});
      message.textContent='Enter a valid, non-negative value in each field. Appointments and changes must be whole numbers.';
      return;
    }
    var adminHours=((numbers[0]*numbers[1])+(numbers[2]*numbers[3]))/60;
    var weekly=adminHours*numbers[4];
    if(!Number.isFinite(weekly*52)){
      Object.keys(outputs).forEach(function(key){outputs[key].textContent='—';});
      message.textContent='These values are too large to calculate. Please use figures for a normal working week.';
      return;
    }
    outputs.hours.textContent=hours.format(adminHours);
    outputs.weekly.textContent=formatMoney(weekly);
    outputs.annual.textContent=formatMoney(weekly*52);
    message.textContent='Current booking administration only. Annual estimate assumes 52 similar weeks. This is not a promised saving from DockSync.';
  }
  calculator.hidden=false;
  calculator.addEventListener('input',calculate);
  calculator.addEventListener('submit',function(event){event.preventDefault();calculate();});
  calculator.querySelector('[data-reset-calculator]').addEventListener('click',function(){
    fields.forEach(function(input){input.value=input.defaultValue;});
    calculate();
  });
  calculate();
})();
