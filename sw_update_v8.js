'use strict';
(function(){
  if(!('serviceWorker' in navigator)||location.protocol==='file:')return;
  navigator.serviceWorker.register('./stock-scanner-sw.js',{updateViaCache:'none'})
    .then(function(registration){return registration.update();})
    .catch(function(){/* The existing online experience remains available. */});
}());
