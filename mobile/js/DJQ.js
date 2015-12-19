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
  D.menu_flyout_duration=0;
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
  // path to product images
  D.product_img_path = '/images/';

  /* For debugging only.  Remove, or set to false for production */
  D.debug_logger = true;

  /* a console logger */
  D.log = function() {
    if (D.debug_logger && arguments.length) {
      for (var i=0; i<arguments.length; i++) { console.log(arguments[i]); }
    }
  }

  /* Gracefully closes any open lightboxes  */
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
    ( ($.isArray(cb)) ? cb : [cb] ).forEach(function(v,k){
      if (v) { allcb.push(v); }
    });
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
    var dd = d=='mouseenter'?'slideDown':'slideUp',
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

  /* ********************************************
   * Begin PageItems element extension
   ******************************************** */

  D.PageItems = function(v,s) {
    this.selector = s || DJQ.PageItems._defaultSelector;
    this.view = v || DJQ.PageItems._defaultView;
  }

  var DP = D.PageItems;

  /* The default view name and selector */
  DP._defaultView = 'page-item';
  DP._defaultSelector = '.is-page-item';

  /* View definitions, keyed to CSS selector formatted for javascript */
  DP.views = {
               page_items: ['rollover','image','name','description','fullprice','pagectl'],
               cart_items: ['cartctl','quantity','cartdel','image',['name','description'],'subtotal'],
               product_presentation: ['name','fullprice','weight','pagectl'],
               quick_order: ['image',['name','description','fullprice'],'quantity','subtotal','pagectl'],
               name_image: ['image','name'],
               m_page_items: ['rollover','image','name','fullprice','pagectl'],
             };

  DP.prototype = {
    /* Resolve and return the CSS selector used to target elements for this collection.
      Will return the first found out of the passed selector, this.selector, or this._defaultSelector.

       s = a CSS selector of items to render
       */
    _resolveSelector: function(s) {
      return s || this.selector || DJQ.PageItems._defaultSelector;
    },

    /* Resolve and return the view to be used for rendering.  Will return the first found
      out of the passed view name, the this.view, or this._defaultView.

       v = name of the view to use (optional)
       */
    _resolveViewName: function(v) {
      /*var vw = String(v),
          ret = this.views[vw];
      if (ret) {
        this.view = vw;
      } else {
        ret = this.views[this.view] || this.views['page_items'];
      }*/
      //return ret;
      return DJQ.PageItems.views[String(v)]
      || DJQ.PageItems.views[this.view]
      || DJQ.PageItems.views['page_items'];
    },

    /* Initializes the object with a view name and CSS selector.

       v = the name of the view
       s = a CSS selector of items to render
       */
    init: function(v,s) {
      this.selector = this._resolveSelector(s);
      this.view = this._resolveViewName(v);
    },

    /* Will render all items with the provided view and selector.  If view or selector are not
       passed, the current properties will determine the view and selector used.

       v = the name of the view
       s = a CSS selector of items to render
       */
    render: function(v,s) {
      var $this=this,
          fld = $this._resolveViewName(v),
          sel = $this._resolveSelector(s),
          ctl = $(sel);
      if (ctl.length) {
        ctl.maxCart({fields:fld});
        ctl.each(function(ok,oi) {
          var ooi = $(oi);
          ooi.data('maxCart').populate(true);
          ooi[(ooi.data('maxCart').data.quantity > 0)?'addClass':'removeClass']('is-selected');
        });
      }
    },
  }

  /* ********************************************
   * End PageItems element extension
   ******************************************** */


})(jQuery,window);