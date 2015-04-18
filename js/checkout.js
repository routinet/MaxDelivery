(function ($,undefined) {

  /* onReady necessities */
  $(document).ready(function() {
    // add hook for selecting the bag type
    $('body').on('click','.checkout-bag-selector', function(e) {
      $('.checkout-bag-selector').removeClass('selected');
      $(e.target).addClass('selected');
    });

    // add hook for updating the cart total when the tip amount changes
    $('body').on('focus','input[name="delivery_tip"]', function(e){
      e.target.oldvalue = parseFloat(e.target.value) || 0;
    });
    $('body').on('change','input[name="delivery_tip"]', function(e){
      if (parseFloat(e.target.value) < 0) { e.target.value = 0; }
      var $t = $('h2.checkout-order-total');
      if ($t.length) {
        var ct = parseFloat(Number($t[0].innerHTML) || 0),
            nv = parseFloat(e.target.value);
        ct = Number(ct - e.target.oldvalue + nv);
        $t.html(ct.toFixed(2));
      }
      e.target.oldvalue = parseFloat(e.target.value) || 0;
    });

    // init the delivery tip
    $('input[name="delivery_tip"]').focus();
  });

})(jQuery);