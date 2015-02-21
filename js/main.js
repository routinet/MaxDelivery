;
/* set jQuery into "no conflict" mode.  Makes debugging a little easier
   if this is commented, but should be uncommented for production
   */
//jQuery.noConflict();

(function ($,undefined) {

  /* onReady necessities */
  $(document).ready(function() {

    /* Hook for category tabs click & slide, with UI changes */
    $('body').on('click','#category-tabs .category-section-title',function(e){
      var nt='', cb=null, i=$(this).parent().find('.category-items'), bgp='', thisobj=this;
      if (i.is(':visible')) {
        nt='View';     cb='slideUp';   bgp='';
        $(this).removeClass('is-open');
      } else {
        nt="Collapse"; cb='slideDown'; bgp='-181px';
        $('#category-tabs .category-section-title.is-open').trigger('click');
        $(this).addClass('is-open')
               .find('.category-chevron-down')
               .css('background-position-x',bgp);
      }
      i[cb](DJQ.category_slide_duration,
            function(){
              $(thisobj).find('.category-click-to-view').html('Click to '+nt);
            });
    });

    /* Hook for navigation menus' mouseenter/mouseleave flyouts */
    $('body').on('mouseenter mouseleave', '.flyout-menu', function(e){ DJQ.handlerNavFlyout(this,e.type); } );

    /* Lightbox for the sign-in/sign-up modal */
    $('body').on('click','.cs-menu-account-button', function(e){
      var t = '#' + e.target.id.replace('cs-menu-','') + '-tab';
      DJQ.showLightbox(e,this,t);
    });

    /* Lightbox for Today on Sale modal */
    $('body').on('click','#today-on-sale a.has-lightbox',function(e){
      e.preventDefault();
      DJQ.showLightbox(e,this);
    });

    /* Lightbox for Today on Sale modal */
    $('body').on('click','#wishlist-button-wrapper',function(e){
      e.preventDefault();
      DJQ.showLightbox(e,this);
    });

    /* Lightbox for the show/cart checkout modal */
    $('body').on('click','#cart-checkout-button-wrapper',function(e){
      DJQ.Cart.getContents(DJQ.populateCartPopOut);
      /*DJQ.Cart.getContents(DJQ.populateCartModal);
      DJQ.showLightbox(e,this,'cart');*/
    });

    /* Lightbox for the reorder modal */
    $('body').on('click','#cart-reorder-button-wrapper',function(e){
      DJQ.showLightbox(e,this);
      DJQ.Cart.getReorder(DJQ.populateReorderModal);
      $('.search-autosuggest').autocomplete({
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
    });

    /* Hook for bag selection on checkout modal */
    $('body').on('click','#checkout-cart-tab .checkout-modal-bag-type', function(e){
      $('#checkout-cart-tab .checkout-modal-bag-type').css('background-position','').removeClass('is-selected');
      $(this).addClass('is-selected').css('background-position','-1px -1px');
    });

    /* Hook for order details accordian on checkout modal */
    $('body').on('click', '#checkout-tab-items th.checkout-summary-full-descript, #checkout-cart-tab .checkout-modal-item-detail-toggle', function(e){
      var tg = $(e.target);
      if (tg.hasClass('checkout-modal-item-detail-toggle')) {
        tg.css('font-size','0')
          .closest('.checkout-modal-item-detail')
          .find('.show-cart-tab-wrapper')
          .slideDown();
      } else {
        tg.closest('.show-cart-tab-wrapper')
          .slideUp()
          .closest('.checkout-modal-item-detail')
          .find('.checkout-modal-item-detail-toggle')
          .css('font-size','');
      }
    });

    /* Populate totals for the checkout modal */
    $('body').on('click','a[href="#checkout-cart-tab"]',function(e){
      DJQ.Cart.getContents(DJQ.populateCheckoutModal);
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


    /* Add the cart quantity autocomplete box on initial click.
       This also hooks into the focus event to trigger the suggestion box.
       */
    $('body').on('click','input.cart-item-qtysel',function(e){
      if (!$(e.target).data('ui-autocomplete')) {
        $(e.target).autocomplete({ minLength: 0,
                               source: function(rq,rp){ rp(['1','2','3','4','5','6','7','8','9','10']); },
                               position:{ my: "right top", at: "right bottom", collision: "none" }
                             })
               .on('focus',function(){$(this).autocomplete('search','');})
               .trigger('focus');
      }
    });

    /* For tab-level quantity selectors, modify the add-to-cart icon on change.
       This hooks the standard onChange, as well as autocomplete's custom
       autocompletechange event.
       */
    $('body').on('change autocompletechange','.is-cart-item input.cart-item-qtysel',function(){
        var m = Number(this.value)>0 ? 'addClass' : 'removeClass';
        $(this).siblings('.cart-item-add')[m]('is-selected');
      });

    /* For cart/checkout modal, update the cart when quantity changes.
       This hooks the standard onChange, as well as autocomplete's custom
       autocompletechange event.
       */
    $('body').on('change autocompletechange','#show-cart-tab .is-cart-item input.cart-item-qtysel',function(){
        var count = Number(this.value);
        if (count) {
          DJQ.submitProductToCart($(this).closest('.is-cart-item'));
        } else {
          $(this).closest('tr').find('.cart-item-remove-button').click();
        }
      });

    /* Add hook for tab-level add-to-cart button clicks.
       This will submit the product via AJAX, and clear the quantity selector
       and add-to-cart icon.
       */
    $('body').on('click','.is-cart-item .cart-item-add.is-selected', function(e){
      var count=Number($(this).siblings('.cart-item-qtysel').val()).toFixed(0);
      if (count) { DJQ.submitProductToCart($(this).closest('.is-cart-item')); }
    });

    /* Add hook for reorder modal add-to-cart button click
       This will submit all products via AJAX.
       */
    $('body').on('click','.reorder-modal-addtocart', function(e) {
      DJQ.submitProductToCart($(this).closest('.lightbox-reorder-wrapper').find('table'));
      DJQ.closeLightboxes();
      $('#cart-checkout-button-wrapper').click();
    });

    /* Add hook for clearing the cart
       This was for testing/debugging purposes and can be removed if unneeded
       */
    $('body').on('click','#account-menu-clear-cart', function(e){
      DJQ.submitClearCart();
      DJQ.Cart.updateIcon();
      alert('Your cart has been cleared');
    });

    /* Add hook for deleting a single item from the cart */
    $('body').on('click','td .cart-item-remove-button', function(e){
      DJQ.Cart.deleteItem($(this));
      DJQ.Cart.updateIcon();
    });

    /* if logged in, update the cart icon and expand the reorder section */
    if ($('body').hasClass('is-logged-in')) {
      DJQ.Cart.updateIcon();
      if ($('#section-reorder').length && (!$('#section-reorder .is-open').length)) {
        $('#section-reorder .category-section-title').click();
      }
    }

  });
})(jQuery);