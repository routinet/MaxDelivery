/* global namespace */
var DJQ = DJQ || {};

(function ($,undefined) {
  /* number of milliseconds between requests to update the order status pointers */
  DJQ.delayOrderStatusUpdate = 5000;

  /* onReady necessities */
  $(document).ready(function() {
    // apply a status update  order-status-breadcrumb-item order-status-step-completed
    DJQ.handlerOrderStatusUpdate = function(r) {
      var items = $('.order-status-breadcrumb-item'),
          ct = parseInt(r.responseJSON.step || 0);
      items.removeClass('order-status-step-completed').addClass('order-status-step-pending');
      for (var i=0; i<=ct; i++) {
        $(items[i]).removeClass('order-status-step-pending').addClass('order-status-step-completed');
      }
    }
    // call for a status update
    DJQ.submitOrderStatusUpdate = function(onum, cs, cb) {
      var o = { data:$.param({ requestType:'orderstatus', orderNum:onum, currentStep:cs }), complete:cb || DJQ.handlerOrderStatusUpdate };
      DJQ.doAjax('orderstatus',o);
    }

    // wrapper for updating the status
    DJQ.updateOrderStatus = function () {
      var onum = parseInt($('#order-status-number').html() || 0);
      if (onum) { DJQ.submitOrderStatusUpdate(onum, $('.order-status-step-completed').length); }
    }

    // timer for status update
    DJQ.intervalOrderStatus = window.setInterval(DJQ.updateOrderStatus, DJQ.delayOrderStatusUpdate);

    /* for testing, allow clicking the order number to progress the counter */
    /*$('body').on('click','#order-status-number', function(e) {
      DJQ.updateOrderStatus();
    });*/
  });

})(jQuery);