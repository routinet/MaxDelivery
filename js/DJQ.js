/* A library of routines commonly used through the site */

/* global namespace */
var DJQ = DJQ || {};

(function ($,window,undefined) {
  /* easy reference */
  var D = DJQ;

  /* common variables */
  // temporary cache of timer objects for animation delays
  D.menu_timer = {};
  // milliseconds of delay between a hover and the flyout
  D.menu_flyout_delay=250;
  // milliseconds of duration for flyout animation
  D.menu_flyout_duration=250;
  // milliseconds of duration for category tab slide animation
  D.category_slide_duration=500;
  // cache of jqXHR objects
  D.jqxhr = {};
  // default AJAX method
  D.ajax_method = "POST";
  // default AJAX URL
  D.ajax_url = '/ajaxhandler.php';
  // array to hold returned suggestion words
  D.word_fragments = [];

  /* For debugging only.  Remove, or set to false for production */
  D.debug_logger = true;

  /* a console logger */
  D.log = function() {
    if (D.debug_logger && arguments.length) {
      for (var i=0; i<arguments.length; i++) { console.log(arguments[i]); }
    }
  }

  /* Gracefully closes any open lightboxes */
  D.closeLightboxes = function() {
    $('.has-lightbox').each( function(k,v) {
      var a=$.data(v,'nivoLightbox');
      if (a && a.destructLightbox) { a.destructLightbox(); } })
  }

  /* Simple management of AJAX calls
     This handler utilizes the request cache DJQ.jqxhr, and formats an
     AJAX request to include fields required by the server.  It also
     sets a method (default POST), a default dataType, and replaces the
     .complete callback with a custom handler.  Any current assignment
     of .complete is cached.  All AJAX parameters except .complete can
     be overridden by passing an options object.

     n = name of this AJAX call
     o = custom options to override defaults, see jQuery's .ajax() options
     cb = a callback to add to the end of the .complete chain
     */
  D.doAjax = function(n,o,cb) {
    n = n || 'default';
    o = o || { type:'POST' };
    var t = t || (o.type ? o.type : D.ajax_method),
        allcb = o.complete ? ($.isArray(o.complete) ? o.complete : [ o.complete ]) : []
        ;
    if (D.jqxhr[n]) {
      try {
        D.jqxhr.abort();
      } catch(e) { };
      D.jqxhr[n] = null;
    }
    if (cb) { allcb.push(cb); }
    var oo = $.extend( { type:t, dataType:'json', url:D.ajax_url }, o, { complete:D.handlerDoAjax } );
    D.jqxhr[n] = $.ajax(oo);
    D.jqxhr[n].userHandler = allcb;
  }

  /* In case an AJAX call fails

     m = a message to use in the alert
     */
  D.failAlert = function(m) {
    alert(m);
  }

  /* Generates the AJAX-enabled add-to-cart buttons for cart items
     The function will return a copy

     t = a jQuery selection of elements
     */
  D.generateCartControls = function(t) {
    var
      qtyinput = $('<input type="text" name="quantity" placeholder="1"/>').addClass('cart-item-qtysel'),
      quantity = $('<div/>').addClass('cart-item-quantity').html(qtyinput),
      addcart  = $('<div/>').addClass('cart-item-add cart-item-icon sprite'),
      wishlist = $('<div/>').addClass('cart-item-wish cart-item-icon sprite'),
      toinsert = $('<div/>').addClass('cart-item-controls')
                            .append(qtyinput)
                            .append(addcart)
                            .append(wishlist)
      ;
    if (t) {
      t.each(function(){
        if (!$(this).children('.cart-item-controls').length) {
          $(this).append(toinsert.clone());
        }
      });
    }
    return toinsert;
  }

  /* handler for general AJAX
     A custom AJAX return handler.  When an AJAX call is executed
     through DJQ.doAjax(), this handler is called before any other
     handlers in the .complete property.  After error checking the
     response, any other cached handlers (.complete, followed by
     the custom callback, see DJQ.doAjax) are called in order.

     The function signature is as required for $.ajax.complete.
     */
  D.handlerDoAjax = function(r,s) {
    var $this = this;
    D.log('===AJAX response JSON', r.responseJSON);
    if ((!r.responseJSON) || r.responseJSON.result!='OK') {
      D.log('AJAX call failed! ('+s+")","result=",r.responseJSON.result,"\nmsg=",r.responseJSON.msg);
    }
    if (r.userHandler && r.userHandler.length) {
      r.userHandler.forEach(function(v,i){ if (v && typeof(v) == 'function') { v.call($this, r, s); } });
    } else {
      D.log('---AJAX call has no custom handlers');
    }
  }

  /* handles returning from a login request
     OBSOLETE
     Handles UI changes and body class assignment required by the results
     of a login attempt.

     r = a jQuery response object
     */
  D.handlerLoginStatus = function(r) {
    switch(r.responseJSON.login_status) {
      case 'login':
        // for login, set body to a logged in state, and add the username to the top menu
        $('body').removeClass('not-logged-in').addClass('is-logged-in');
        if (!(r.responseJSON.username > '')) { r.responseJSON.username = 'User'; }
        $('#cs-menu-my-account-name').html(r.responseJSON.username);
        break;
      default:
        // otherwise, make sure body class does not reflect a logged in state
        $('body').removeClass('is-logged-in').addClass('not-logged-in');
        break;
    }
    // close any lightboxes or menus that might be open
    $('.nivo-lightbox-close').click();
    $('.flyout-menu').each(function(i){ D.handlerNavFlyout(this,'mouseleave'); });
  }

  /* event handler for main navigation flyout
     Introduces a delay between the mouseover event and the flyout animation.  This
     uses DJQ.menu_flyout_duration and DJQ.menu_flyout_delay.

     o = the id for any ancestor element of the flyout (actual element must be a ul)
     d = name of the mouse event being triggered (mouseenter or mouseleave, default to mouseleave)
     */
  D.handlerNavFlyout = function(o,d) {
    var dd = d=='mouseenter'?'show':'hide',
        t  = o.id.replace(/-/g,'_')
        ;
    window.clearTimeout(D.menu_timer[t]);
    D.menu_timer[t] =
      window.setTimeout(function(){
        $('#'+o.id+' ul')[dd](D.menu_flyout_duration);
      }, D.menu_flyout_delay);
  }

  /* event handler for word hint return
     Currently unused by jquery-ui control
     Formats the AJAX response data into a single-element array, which is
     then stored in DJQ.word_fragments.

     r = a jQuery response object
     */
  D.handlerWordFragment = function(r) {
    D.word_fragments = r.words.map(function(v,i){return v;});
  }

  /* Populates #show-cart-tab with cart contents, totals, and suggestions

     r = a jQuery response object, usually from DJQ.handlerGetCartContents
     */
  D.populateCartModal = function(r) {
    $('.show-cart-modal-content .show-cart-tab-wrapper').remove();
    $('.show-cart-modal-content .show-cart-totals-wrapper').remove();
    $('.show-cart-modal-content').append(D.Cart.generateTable())
                                 .append(D.Cart.generateTotals());
  }

  /* Populates #show-cart-tab with cart contents, totals, and suggestions

     r = a jQuery response object, usually from DJQ.handlerGetCartContents
     */
  D.populateCheckoutModal = function(r) {
    $('.checkout-modal-content .checkout-totals-wrapper').remove();
    $('.checkout-modal-content .show-cart-tab-wrapper').remove();
    $('.checkout-modal-item-detail').append(D.Cart.generateTable(null,null,true));
    $('.checkout-modal-content .checkout-modal-totals').prepend(D.Cart.generateTotals(null,null,true));
    $('#checkout-cart-tab .checkout-modal-item-detail-toggle').css('font-size','14pt');
  }

  /* Populates reorder modal with cart contents

     r = a jQuery response object, usually from DJQ.handlerGetCartContents
     */
  D.populateReorderModal = function(r) {
    $('.reorder-modal-items .show-cart-tab-wrapper').remove();
    $('.reorder-modal-items').append(D.Cart.generateTable(null,'reorder-modal-item-list',false));
  }

  /* finds the closest parent with an id attribute and returns the id
     If no id is found in any parent, 'body' is returned.

     elem = the element to search from
     */
  D.resolveParentID = function(elem) {
    var source = '',
        e = $(elem)
        ;
    while (!source) {
      e = e.parent();
      source = e.attr('id');
      if (!e.length || (e.is('body') && !source)) { source='body'; }
    }
    return source;
  }

  /* show a lightbox
     Using a wrapper to allow for post-lightbox initializations, like
     moving the close button.  Also necessary because the jQuery UI tab
     events do not survive being copied by the lightbox, and the correct
     tab may need a click event fired.

     evt = the event triggering the lightbox, e.g., variable e in .on('click',function(e){})
     elem = HTML element (not jQuery) owning the lightbox
     t = if a tab is "clicked", this is target div with the tab content
     th = an optional theme to pass to lightbox (defaults to 'delivery')
     */
  D.showLightbox = function(evt,elem,t,th) {
    if (!th) { th='delivery'; }
    var $elem = $(elem);
    if ($elem.nivoLightbox) {
      $elem.nivoLightbox({
          // set the custom theme, see nivo-lightbox-theme-delivery.css
          theme:th,
          // when the lightbox is shown...
          afterShowLightbox:function(e) {
            // ensure any tabs are initialized, and the proper tab is "clicked"
            e[0].find('.has-tabs').tabs();
            if (t) { e[0].find('a[href='+t+']').click(); }
            // move the close button info the content box
            $('.nivo-lightbox-close').first()
                                     .appendTo('.nivo-lightbox-content .lightbox-content')
                                     .show();
          },
          // when the lightbox is about to be closed...
          beforeHideLightbox:function(){
            // move the close button back to preserve click events
            $('.lightbox-content .nivo-lightbox-close').hide()
                                                       .appendTo('.nivo-lightbox-overlay');
          },
      });
      // show the lightbox
      $elem.data('nivoLightbox').showLightbox(evt);
    }
  }

  /* submit credentials to AJAX handler
     OBSOLETE
     Creates an AJAX request to verify account credentials

     rt = AJAX command to process (e.g., account-login)
     f = the HTML form being submitted (an HTML form, not a jquery object)
     cb = a custom callback to add to the .complete chain
     */
  D.submitAccount = function(rt, f, cb) {
    var ff = f ? $(f).serialize() : $.param({requestType:rt}),
        o = { data:ff,
              complete:cb || D.handlerLoginStatus
            }
        ;
    D.doAjax('account',o);
  }

  /* submit a request to clear the cart
     FOR DEVELOPMENT PURPOSES
     */
  D.submitClearCart = function() {
    D.doAjax('clearcart', {data:$.param({requestType:'cart-clear'})});
  }

  /* submits all products found in children of an element

     elem = the top-level element, which is searched for .is-cart-item
     use_cb = true/false indicating if cart icon should be updated afterwards
     */
  D.submitProductToCart = function(elem,use_cb) {
    var e = $(elem),
        qe = e.hasClass('is-cart-item') ? e : e.find('.is-cart-item'),
        source = D.resolveParentID(e),
        toadd = []
        ;
    // if there is no section ancestor, could be a lightbox
    if (!source) { source='unknown'; }
    $.each(qe, function(k,v){
      var code = $(v).data('prodcode') || $(v).find('.cart-item-code').val(),
          qty = Number($(v).find('.cart-item-qtysel').val()).toFixed(0)
          ;
      toadd.push( {qty:qty, code:code, source:source} );
      $(v).find('.is-selected').removeClass('is-selected');
      $(v).find('.cart-item-qtysel').val('').trigger('change');
    });
    if (toadd.length) {
      if (use_cb === undefined) { use_cb = true; }
      var dd = { requestType:'cart-add-product',
                 products: toadd
               },
          o = { data:$.param(dd) };
      if (use_cb) { o.complete = D.Cart.updateIcon; }
      D.doAjax('addproduct',o);
    }
  }

  /* submits a new product to add to the cart

     elem = the top-level .is-cart-item element
     use_cb = true/false indicating if cart icon should be updated afterwards
     */
  /*D.submitProductToCart = function(elem,use_cb) {
    var e = $(elem),
        qe = e.find('.cart-item-qtysel'),
        qty = Number(qe.val()).toFixed(0),
        code = e.data('prodcode'),
        source = D.resolveParentID(e)
        ;
    // if there is no section ancestor, could be a lightbox
    if (!source) { source='unknown'; }
    if (qty && code) {
      if (use_cb === undefined) { use_cb = true; }
      var dd = { requestType:'cart-add-product',
                 products: [ { qty:qty, code:code, source:source } ]
               },
          o = { data:$.param(dd) };
      if (use_cb) { o.complete = D.Cart.updateIcon; }
      D.doAjax('addproduct',o);
    }
    e.find('.is-selected').removeClass('is-selected');
    qe.val('').trigger('change');
  }*/

  /* submit word hint to AJAX handler
     Currently unused by jquery-ui control.
     Creates an AJAX request to retrieve suggestion words based on a word fragment.

     w = word fragment to send
     cb = a custom callback to add to the .complete chain
     */
  D.submitWordFragment = function(w, cb) {
    var o = { data:$.param({ requestType:'wordlist', fragment:w }), complete:cb || D.handlerWordFragment };
    D.doAjax('wordlist',o);
  }

})(jQuery,window);