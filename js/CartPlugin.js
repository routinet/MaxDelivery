/*
* MaxDelivery Cart Plugin for jQuery
*
* Copyright 2015, MaxDelivery.com
* This software may not be reused without the express written
* permission of the rights holder.
*/

;(function($, window, document, undefined){

  /* ********************************************
   * Begin _MaxCart and MaxCart data container
   ******************************************** */

  /* The object prototype */
  window._MaxCart = function() {
    this.init();
  }

  _MaxCart.prototype = {
    /* Initializes the cart data */
    init: function() {
      this.clear();
    },

    /* Clears the current cart data */
    clear: function() {
      this.is_loaded = false;
      this.data = { items:[], delivery:0, item_count:0, subtotal:0, tax:0, total:0 };
    },

    /* Retrieves current cart contents, including totals, etc.

       cb = array of callbacks to execute after handlerGetCartContents
       */
    getContents: function(cb) {
      var o = { data: $.param({requestType:'cart-content'}), complete: [$.proxy(this.handlerGetContents,this)] };
      ( ($.isArray(cb)) ? cb : [cb] ).forEach(function(v,k){
        if (v) { o.complete.push(v); }
      });
      DJQ.doAjax('cartcontent', o);
    },

    /* set the cart data from the AJAX return
       See getContents() for adding more callbacks.

       r = a jQuery response object
       */
    handlerGetContents: function(r) {
      this.set(r.responseJSON.cart, true);
    },

    /* Sets the cart data

       c = a JSON representation of the cart
       l = indicates if the data was loaded or not
       */
    set: function(c,l) {
      this.clear();
      $.extend(this.data,c);
      this.is_loaded = Boolean((l==undefined) ? true : l);
    },

    /* event handler for cart icon totals return
       Parses the response and updates any elements with .cart-checkout-button

       r = a jQuery response object
       */
    handlerUpdateIcon: function(r) {
      var n = Number(r.responseJSON.cart_count),
          t = Number(r.responseJSON.cart_total).toFixed(2);
      if (!t) { t=''; }
      $('.cart-checkout-button .cart-total-items').html(n);
      $('.cart-checkout-button .cart-total-amt').html(t);
    },

    /* Saves the state of the cart flyout

       st = boolean value indicating if flyout is shown (true) or hidden (false)
       cb = an optional callback to execute after the AJAX call
       */
    saveFlyoutState: function(st,cb) {
      var o = { data: $.param({requestType:'flyout-state', flyout_state:Boolean(st)?1:0, complete:[]}) };
      ( ($.isArray(cb)) ? cb : [cb] ).forEach(function(v,k){
        if (v) { o.complete.push(v); }
      });
      DJQ.doAjax('flyoutstate', o);
    },

    /* update the cart/checkout button with correct totals */
    updateIcon: function() {
      var o = { data:$.param({requestType:'cart-totals'}), complete:$.proxy(this.handlerUpdateIcon,this) };
      DJQ.doAjax('carticon',o);
    },

    /* submit a request to clear the cart
       FOR DEVELOPMENT PURPOSES
       */
    submitClearCart: function() {
      DJQ.doAjax('clearcart', {data:$.param({requestType:'cart-clear'})});
    },

  }

  /* instantiate the cart data model */
  window.MaxCart = new _MaxCart();

  /* ********************************************
   * End _MaxCart and MaxCart data container
   ******************************************** */


  /* ********************************************
   * Begin CartFlyOut element extension
   ******************************************** */

  /* see CartItem object for explanation of properties */
  var _CartFlyoutDefaultOptions = {
    fields: ['cartctl','quantity','cartdel','image','name','description','subtotal'],
  }

  CartFlyOut = function(element, options) {
    this.el = element;
    this.$el = $(this.el);
    this.options = {};
    this.init(options);
  }

  CartFlyOut.prototype = {
    /* Initializes the object
       options = an object of properties { name:value }
       */
    init: function(options) {
      this.options = $.extend({}, _CartFlyoutDefaultOptions, this.options, options);
    },

    /* Removes an existing list of cart items */
    clear: function() {
      this.$el.children('.cart-item-list-wrapper').remove();
    },

    /* Populates the element with the list of cart items

       pre = Boolean indicating if items should be prepended (true) or appended (false)
       */
    populate: function(pre) {
      this._createWrapper(pre);
      MaxCart.getContents($.proxy(this._addItems,this));
    },

    /* resizes the cart flyout
       current setting is top flush with main-navigation-bar, bottom flush with viewport
       */
    resize: function() {
      /* for "collapsing" header area */
      /*var xx=$(document).scrollTop(),
          tt=150-xx
          ;
      if (tt < 50) { tt=50; }
      $('.cart-item-list-entries').css('height',
                                          window.innerHeight
                                          - ($('.cart-item-list-entries').offset() || {top:0}).top
                                          - $('#cart-bar-flyout-link').outerHeight(true)
                                          + xx
                                       );*/
      $('.cart-item-list-entries').css( 'height', window.innerHeight - 160 - $('#cart-bar-flyout-link').outerHeight(true) );
      $('#cart-bar-flyout').css({height:window.innerHeight - 140, top:150});
    },

    /* Internal function, creates an item wrapper */
    _createItemWrapper: function() {
      return $('<div class="cart-list-item is-cart-item clearfix">');
    },

    /* Internal function, creates the overall and items wrappers

       pre = Boolean indicating if $.prepend (true) or $.append (false) should be used
             Defaults to true
       */
    _createWrapper: function(pre) {
      this.clear();
      pre = pre==undefined ? true : Boolean(pre);
      var m = (pre==undefined ? true : Boolean(pre)) ? 'prepend' : 'append',
          wrap = $('<div/>').addClass('cart-item-list-wrapper')
                            .append( $('<div class="cart-item-list-entries"/>') )
      ;
      this.$el[m](wrap);
      return this.$el.children('.cart-item-list-wrapper');
    },

    /* Internal function, adds items to the flyout
       This should be pushed as a callback to MaxCart.getContents for proper
       automation.  It can be called independently as long as MaxCart.data
       has been populated.
       */
    _addItems: function() {
      var $this = this,
          $el = this.$el.children('.cart-item-list-wrapper')
      ;
      if (!$el.length) { el = this._createWrapper(); }
      var $list = $el.children('.cart-item-list-entries');
      MaxCart.data.items.forEach(function(v,k){
        var $item = $this._createItemWrapper();
        $item.maxCart({ fields:$this.options.fields }, v);
        $item.data('maxCart').populate();
        $list.append($item);
      });
    },

  }

  /* ********************************************
   * End CartFlyOut element extension
   ******************************************** */




  /* ********************************************
   * Begin CartItem element extension
   ******************************************** */

  /* Default to using div elements. All possible fields to include:
        image: an <img> element set to the product image
        name: the name of the product
        description: the description of the product
        fulldesc: the name and description, wrapped in a container
        fullprice: the decimal price, rounded to two decimal places, including per units (e.g., 1.00/ea)
        price: the decimal price, rounded to two decimal places (no per units)
        units: the per units designation
        cartctl: the controls used to edit an item in the cart view
        pagectl: the controls used to edit an item in the page view
        quantity: the integer quantity
        subtotal: decimal (price * quantity), rounded to two decimal places
        cartdel: the control used to remove an item from the cart view
        pagedel: the control used to remove an item from the page view
     */
  var _CartItemDefaultOptions = {
    innerElem: 'div',
    outerElem: 'div',
    fields: ['image','name','description','fullprice','quantity','subtotal'],
  }

  CartItem = function(element, options, data){
    this.el = element;
    this.$el = $(this.el);
    this.data = data ? data : this._resolveData();
    this.options = {};
    this.init(options);
    /* for chaining */
    return this;
  }

  CartItem.prototype = {
    /* Initializes the object
       options = an object of properties { name:value }
       */
    init: function(options) {
      this._is_add_item = this.$el.hasClass('is-cart-add-item');
      this.options = $.extend({}, _CartItemDefaultOptions, this.options, options);
      this._setElements();
      this.$el.on('change',$.proxy(this._updateValue,this));
    },

    /* Internal function, calls a view to generate.
       This function maintains the proper scope of 'this' by using $.proxy()

       n = name of view
       */
    _callView: function(n) {
      return $.proxy(this.views['_generate_'+n],this);
    },

    /* A recursive function to render a named datapoint, or an array of named
       datapoints.

       n = a string or array of strings for datapoint names
       */
    _renderPoint: function(n) {
      var seq = $.isArray(n),
          ret = seq
                ? $('<div class="product-view-subcontainer" />')
                : this._callView(n);
      if (seq) {
        var $this = this;
        n.forEach(function(v,k) {
          ret.append($this._renderPoint(v));
        });
      }
      return ret;
    },

    /* Internal function, resolves data from parent element if data is not passed in */
    _resolveData: function() {
      this.data = this.data || {};
      var datafields = ['id','prodcode','name','price','quantity','priceunit','description','imgpath','weight','subtotal'],
          ret = this.data || {},
          $this = this;
      this._updateValue();
      datafields.forEach(function(v,k){
        if (!ret[v]) {
          ret[v] = $this.$el.data(v);
        }
      });
      return ret;
    },

    /* Internal function, sets the elements to be used in view construction */
    _setElements: function() {
      this._ie = ['<',(this.options.innerElem || 'div'),'/>'].join('');
      this._oe = ['<',(this.options.outerElem || 'div'),'/>'].join('');
    },

    _updateValue: function() {
      this.data.quantity = this.$el.find('.cart-item-qtysel').val();
      this.$el.data('quantity', this.data.quantity);
    },

    /* Triggers a population of the control

       c = boolean indicating if the element should be cleared prior to populating
       */
    populate: function(c) {
      if (c) { this.$el.empty(); }
      /*this.options.fields.forEach(function(v,k) {
        $this.$el.append($this._callView(v));
      });*/
      this.$el.append(this._renderPoint(this.options.fields).children());
    },

    /* finds the closest parent with an id attribute and returns the id
       If no id is found in any parent, 'body' is returned.

       elem = the element to search from
       */
    resolveSource: function() {
      var source = '',
          e = this.$el
          ;
      while (!source) {
        e = e.parent();
        source = e.attr('id');
        if (!e.length || (e.is('body') && !source)) { source='body'; }
      }
      return source;
    },

    /* pushes the current values to the database */
    update: function() {
      this.data.source = this.resolveSource();
      this._updateValue();
      DJQ.doAjax('cartupdate',{
        data:$.param({ requestType:'cart-update', itemdata: this._resolveData() }),
        complete:$.proxy(MaxCart.updateIcon,MaxCart)
      });
    },

    /* an object container for all rendering methods
       use _callView() to access these methods to proxy the scope
       */
    views: {
      /* generates the in-cart controls*/
      _generate_cartctl: function() {
        var tid = parseInt(this.data.id) || '',
            tcd = this.data.code || 'nocode',
            tqt = parseInt(this.data.quantity) || 0,
            ct_qtysel = $('<input/>').attr('type','text')
                                     .attr('name','quantity')
                                     .attr('value',tqt)
                                     .addClass("cart-item-qtysel")
        ;
        return $(this._ie).addClass('cart-item-qtyctl')
                          .data({prodcode:tcd, cartid:tid})
                          .append('<div class="cart-item-quantity-add sprite"/>')
                          .append(ct_qtysel)
                          .append('<div class="cart-item-quantity-del sprite"/>')
                          .append('<div class="cart-item-quantity-upd sprite"/>');
      },

      /* generate the remove button element */
      _generate_cartdel: function() {
        return $(this._ie).addClass('cart-item-remove').html('<div class="cart-item-remove-button sprite"></div>');
      },

      /* generate the description element */
      _generate_description: function() {
        return $(this._ie).addClass('cart-item-descript').html(this.data.description);
      },

      /* generate the combined name+description elements and wrapper */
      _generate_fulldesc: function() {
        return $(this._ie).addClass('cart-item-full-descript')
                          .append(this._callView('name'))
                          .append(this._callView('description'));
      },

      /* generate the combined price+priceunit elements and wrapper */
      _generate_fullprice: function() {
        return $(this._ie).addClass('cart-item-full-price')
                          .append(this._callView('price'))
                          .append(this._callView('units'));
      },

      /* generate the image element */
      _generate_image: function() {
        return $(this._ie).addClass('cart-item-image-path')
                          .html( $('<img/>').attr('src',(DJQ.product_img_path || '')+this.data.imgpath) );
      },

      /* generate the name element */
      _generate_name: function() {
        return $(this._ie).addClass('cart-item-name').html(this.data.name);
      },

      /* generate page item quantity controls */
      _generate_pagectl: function() {
        var tid = parseInt(this.data.id) || '',
            tcd = this.data.code || 'nocode',
            tqt = parseInt(this.data.quantity) || 0,
            ct_qtysel = $('<input/>').attr('type','text')
                                     .attr('name','quantity')
                                     .attr('value',tqt)
                                     .addClass("cart-item-qtysel")
        ;
        return $(this._ie).addClass('cart-item-qtyctl')
                          .data({prodcode:tcd, cartid:tid})
                          .append('<div class="cart-item-cart-icon sprite"/>')
                          .append('<div class="cart-item-quantity-add sprite"/>')
                          .append('<div class="cart-item-quantity-del sprite"/>')
                          .append('<div class="cart-item-quantity-upd sprite"/>')
                          .append(ct_qtysel)
                          .append(this._callView('quantity'))
                          .append('<div class="cart-item-icon-sep sprite"/>')
                          .append('<div class="cart-item-wish sprite"/>');
      },

      /* generate the price element */
      _generate_price: function() {
        return $(this._ie).addClass('cart-item-price').html((Number(this.data.price) || 0).toFixed(2));
      },

      /* generate the quantity element */
      _generate_quantity: function() {
        return $(this._ie).addClass('cart-item-qtytext').html((Number(this.data.quantity) || 0).toFixed(0));
      },

      /* generate the subtotal element */
      _generate_subtotal: function() {
        var st = Number(this.data.subtotal);
        return $(this._ie).addClass('cart-item-subtotal').html(st ? st.toFixed(2) : '0.00');
      },

      /* generate the priceunit element */
      _generate_units: function() {
        return $(this._ie).addClass('cart-item-priceunit').html(this.data.priceunit);
      },

      /* generate the weight element */
      _generate_weight: function() {
        return $(this._ie).addClass('cart-item-weight').html(this.data.weight);
      },

    }

  };

  /* ********************************************
   * End CartItem element extension
   ******************************************** */


  /* add the CartItem object to each element in the call */
  $.fn['maxCart'] = function(options, data){
    return this.each(function(){
      if(!$.data(this, 'maxCart')){
        $.data(this, 'maxCart', new CartItem(this, options, data));
      } else {
        if (data) { $(this).data('maxCart').data = data; }
        $(this).data('maxCart').init(options);
      }
    });
  };

  /* add the CartFlyOut object to each element in the call */
  $.fn['maxCartFlyOut'] = function(options){
    return this.each(function(){
      if(!$.data(this, 'maxCartFlyOut')){
        $.data(this, 'maxCartFlyOut', new CartFlyOut(this, options));
      } else {
        $(this).data('maxCartFlyOut').init(options);
      }
    });
  };

})(jQuery, window, document);

