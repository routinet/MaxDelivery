;
(function($,document,window,undefined){
  $( document ).on( "mobileinit", function() {
    $.extend( $.mobile , {
      ignoreContentEnabled : true,
      hashListeningEnabled : false,
    });
  });
})(jQuery,document,window);