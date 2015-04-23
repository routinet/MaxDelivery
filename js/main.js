;
/* set jQuery into "no conflict" mode.  Makes debugging a little easier
   if this is commented, but should be uncommented for production
   */
//jQuery.noConflict();

(function ($,undefined) {

  /* onReady necessities */
  $(document).ready(function() {


    /* *********************************
     * Hooks and events
     ********************************* */

    /* Hook for category tabs click & slide, with UI changes */
    $('body').on('click','#category-tabs .category-section-title',function(e){
      if (!$(this).hasClass('no-collapse')) {
        var nt='', cb=null, i=$(this).parent().find('.category-items'), bgp='', thisobj=this, dir=null;
        if (i.is(':visible')) {
          nt='View'; cb='slideUp'; bgp=''; dir='removeClass';
          //$(this).removeClass('is-open');
        } else {
          nt="Collapse"; cb='slideDown'; bgp='-360px'; dir='addClass';
          /* OBSOLETE - for accordian style auto-close */
          //$('#category-tabs .category-section-title.is-open').trigger('click');
        }
        $(this)[dir]('is-open')
               .find('.category-chevron-down')
               .css('background-position-x',bgp);
        i[cb](DJQ.category_slide_duration,
              function(){
                $(thisobj).find('.category-click-to-view').html('Click to '+nt);
              });
      }
    });

    /* Hook for navigation menus' mouseenter/mouseleave flyouts */
    $('body').on('mouseenter mouseleave', '.flyout-menu', function(e){ DJQ.handlerNavFlyout(this,e.type); } );

    /* Hook to show the sign-in/sign-up modal lightbox */
    $('body').on('click','.cs-menu-account-button', function(e){
      var t = '#' + e.target.id.replace('cs-menu-','') + '-tab';
      DJQ.showLightbox(e,this,t);
    });

    /* Hook on the navbar cart button, show the fly-out and save the state */
    $('body').on('click','#cart-checkout-button-wrapper',function(e){
      var tgt = $('#cart-bar-flyout').maxCartFlyOut(),
          $el = $(this),
          st = false
      ;
      if ($el.hasClass('slide-out')) {
        $el.removeClass('slide-out');
      } else {
        tgt.data('maxCartFlyOut').populate();
        $el.addClass('slide-out');
        st = true;
      }
      tgt.toggle('slide', {direction:'right',duration:0,complete:$.proxy(tgt.data('maxCartFlyOut').resize,tgt.data('maxCartFlyOut'))});
      MaxCart.saveFlyoutState(st);
    });

    /* Hook on window resize or document scroll, resize cart flyout */
    $( window ).resize(function() { $('#cart-bar-flyout').maxCartFlyOut().data('maxCartFlyOut').resize(); });
    /* OBSOLETE - for partial-fixed header */
    /*$(document).scroll(function() {
      DJQ.resizeFlyout();
      var doccls = ($(this).scrollTop() > 99) ? 'addClass' : 'removeClass';
      $('#main-navigation-bar')[doccls]('sticky');
    });*/

    /* Hook on the quantity selector, show the update icon */
    $('body').on('focusin focusout', '.cart-item-qtysel', function(e){
      var dir = e.type=='focusin' ? 'addClass' : 'removeClass';
      $(e.target).select().closest('.cart-item-qtyctl')[dir]('is-editing');

    });

    /* Hook on in-page cart icons, show the quantity textbox as update icon */
    $('body').on('click', '.is-page-item .cart-item-cart-icon, .is-page-item .cart-item-qtytext', function(e) {
      $(e.target).closest('.cart-item-qtyctl')
                 .addClass('is-editing')
                 .children('.cart-item-qtysel')
                 .show()
                 .focus();
    });

    /* Add hook for quantity add/delete button clicks.
       This will submit the product via AJAX for insert/update.
       */
    $('body').on('click','.cart-item-quantity-add, .cart-item-quantity-del', function(e){
      var $et = $(e.target),
          t = $et.siblings('.cart-item-qtysel');
      if (t.length) {
        var count=parseInt(t.val());
        count += ($et.hasClass('cart-item-quantity-add') ? 1 : -1);
        if (count < 0) { count = 0; }
        t.val(count).trigger('change');
      }
    });

    /* Add hook to update text version quantity when textbox changes */
    $('body').on('change','.cart-item-qtysel', function(e){
      var t = $(this).siblings('.cart-item-qtytext'),
          c = Number($(this).val());
      if (t.length) { t.html(c); }
      $(this).closest('.is-page-item,.is-cart-item').data('maxCart').update();
    });

    /* Add hook for clearing the cart
       This was for testing/debugging purposes and can be removed if unneeded
       */
    $('body').on('click','#account-menu-clear-cart', function(e){
      MaxCart.submitClearCart();
      MaxCart.updateIcon();
      alert('Your cart has been cleared');
    });

    /* Add hook for expanding sub-category filter bar menus */
    $('body').on('click','.subcategory-filter-menu-item', function(e){
      var elem = $(e.target),
          tm = elem.data('targetmenu') || '',
          ftm = elem.siblings('.filter-menu-flyout[data-menuname="'+tm+'"]'),
          chn = elem.hasClass('is-active') ? 'removeClass' : 'addClass'
          ;
      $('.filter-menu-flyout,.subcategory-filter-menu-item').removeClass('is-active');
      elem[chn]('is-active');
      ftm[chn]('is-active');
    });

    /* Add hook for filter bar menu close button */
    $('body').on('click','.filter-menu-flyout-close', function(e){
      $('.filter-menu-flyout,.subcategory-filter-menu-item').removeClass('is-active');
    });

    /* Add hook for filter bar menu clear link */
    $('body').on('click','.filter-menu-flyout-clear', function(e){
      e.preventDefault();
      $(e.target).closest('.filter-menu-flyout')
                 .find('input[type="checkbox"]')
                 .prop('checked',0);
    });

    /* Add hook for checkout page location selector */
    $('body').on('click','.checkout-location-item', function(e){
      var t = $(this),
          is_new = t.has('.checkout-add-location-icon').length,
          tf = t.closest('#checkout-shipping-address'),
          ts = t.closest('form').find('select[name="checkout_location_type"]').val(t.data('id'));
      // ignore clicks from icons for new addresses
      if (t.hasClass('new-location-type')) {
        t.parent()
         .children('.checkout-location-item.new-location-type')
         .removeClass('selected');
      } else {
        t.parent()
         .children('.checkout-location-item')
         .removeClass('selected');
        tf[is_new ? 'addClass' : 'removeClass']('is-new-address');
      }
      t.addClass('selected');
      /* populate the form values */
      tf.find('input[name*="checkout_"]').each(function(k,v){
        var $v=$(v),
            tname=$v.attr('name'),
            tdata=tname.replace('checkout_','data-');
        $v.val(t.attr(tdata) || '');
      });
    });

    /* Add hook for checkout page credit card selector */
    $('body').on('click','.saved-card-entry', function(e){
      var t = $(this),
          is_new = t.hasClass('add-new-card'),
          tf = t.closest('#checkout-billing-info'),
          ts = t.closest('form').find('select[name="checkout_cctype"]').val(t.data('id'));
      if (t.hasClass('new-cctype')) {
        t.parent()
         .children('.saved-card-entry.new-cctype')
         .removeClass('selected');
      } else {
        t.parent()
         .children('.saved-card-entry')
         .removeClass('selected');
        tf[is_new ? 'addClass' : 'removeClass']('is-new-cctype');
      }
      t.addClass('selected');
      /* populate the form values */
      tf.find('input[name*="billing_"],select[name*="billing_"]').each(function(k,v){
        var $v=$(v),
            tname=$v.attr('name'),
            tdata=tname.replace('billing_','data-');
        $v.val(t.attr(tdata) || '');
      });
    });

    /* Add hook for billing address selector */
    $('body').on('change','select[name="checkout_saved_bill_address"]', function(e){
      var t = $(this),
          v = t.val();
      t.closest('#checkout-billing-info')[Number(v) ? 'removeClass' : 'addClass']('is-new-bill-address');
    });

    /* Add hook for delivery instructions accordian */
    $('body').on('click','.has-expandable', function(e){
      var t = $(this);
      t[t.hasClass('expanded') ? 'removeClass' : 'addClass']('expanded');
    });

    /* *********************************
     * Page initialization
     ********************************* */

    /* populate the page items with controls */
    var init_items = [ ['page_items','.is-page-item'],
                       ['cart_items','.is-cart-item'],
                       ['product_presentation','#product_presentation .is_page_item'],
                       ['quick_order','#previous-order-detail-product-list .is-page-item'],
                     ];
    init_items.forEach(function(v,k) {
      var t = new DJQ.PageItems(v[0],v[1]).render();
    });

    /* add the auto-suggest box
       Even though DJQ has handlers for this, it is coded inline because of
       .autocomplete() using internal request/response objects.
       */
    $('#quick-search-term').autocomplete({
		      	minLength: 1,
		      	source: function( req, resp ) {
		      	  $.ajax({
		      	           url : DJQ.ajax_url,
		      	           dataType: "json",
		      	           type:'POST',
		      	           data: $.param({ fragment:req.term, requestType:'wordlist' }),
		      	           success: function(d) {
		      	             resp( $.map(d.words,function(i) { return i; }) );
		      	           }
		          });
		      	}
    });

    /* if logged in, update the cart icon and expand the reorder section */
    if ($('body').hasClass('is-logged-in')) {
      MaxCart.updateIcon();
      if ($('#section-reorder').length && (!$('#section-reorder .is-open').length)) {
        $('#section-reorder .category-section-title').click();
      }
    }

    /* Set the cart flyout state */
    if (MaxCart.flyout_state) {
      $('#cart-checkout-button-wrapper').click();
    }

    /* Add product page image carousel */
    $('#product-presentation .product-images').tiksluscarousel({nav:'thumbnails',autoPlay:false,progressBar:false,navIcons:false,controls:false});

  });
})(jQuery);