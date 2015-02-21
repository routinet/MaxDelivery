/* global namespace */
var DJQ = DJQ || {};

(function ($,window,undefined) {
  DJQ.Cart = {
    // indicates if an AJAX call has successfully loaded
    is_loaded : false,
    // an array of item objects
    items : [],
    // root path to product images
    product_img_path : '/images/'
  }

  /* easy reference */
  var D = DJQ;
  var C = DJQ.Cart;

  /* Deletes product from the cart

     e = the delete button that triggered the event
     */
  C.deleteItem = function(e) {
    var cartid = $(e).closest('.cart-item-row').find('.cart-item-id').val(),
        o = { data:$.param({requestType:'cart-delete-item', cartID:cartid}),
              complete: C.handlerDeleteItem
            }
    D.doAjax('deleteitem',o);
  }

  /* Generates a table row for a cart item.
     The validity of the passed object is based on the presence of the fields
     required to build the row.

     i = an object having properties for name, code, price, priceunit,
         quantity, subtotal, description, and imgpath
     is_checkout = boolean indicating if the current view is checkout
     */
  C.generateRow = function(i,is_checkout) {
    var row = [];
    is_checkout = is_checkout ? true : false;
    if (!is_checkout) {
      row.push($('<td/>').addClass('cart-item-image-path')
                         .html($('<img/>').attr('src',this.product_img_path+i.imgpath))
      );
    }
    row.push( $('<td/>').addClass('cart-item-full-descript')
                        .append($('<div/>').addClass('cart-item-name').html(i.name))
                        .append($('<div/>').addClass('cart-item-descript').html(i.description))
    );
    row.push( $('<td/>').addClass('cart-item-price')
                        .html('$'+Number(i.price).toFixed(2)+'/'+i.priceunit)
    );
    var ct_cartid = (is_checkout
                    ? null
                    : ($('<input/>').attr('type','hidden')
                                   .attr('name','cartid')
                                   .attr('value',Number(i.id).toFixed(0))
                                   .addClass("cart-item-id"))),
        ct_code   = (is_checkout
                    ? null
                    : ($('<input/>').attr('type','hidden')
                                   .attr('name','productcode')
                                   .attr('value',i.code)
                                   .addClass("cart-item-code"))),
        ct_qtysel = (is_checkout
                    ? Number(i.quantity).toFixed(0)
                    : ($('<input/>').attr('type','text')
                                    .attr('name','quantity')
                                    .attr('value',Number(i.quantity).toFixed(0))
                                    .addClass("cart-item-qtysel")));
    row.push( $('<td/>').addClass('cart-item-quantity ui-front')
                        .append(ct_cartid)
                        .append(ct_code)
                        .append(ct_qtysel)
    );
    var st = Number(i.subtotal);
    st = st ? st.toFixed(2) : '';
    row.push( $('<td/>').addClass('cart-item-subtotal')
                        .html(st)
    );
    if (!is_checkout) {
      row.push( $('<td/>').addClass('cart-item-remove')
                          .html('<div class="cart-item-remove-button"></div>')
      );
    }
    var newrow=$('<tr/>').addClass('cart-item-row is-cart-item')
                         .attr('data-cartid',Number(i.id).toFixed(0));
    row.forEach(function(v,i){newrow.append(v);});
    return newrow;
  }

  /* Create the table used for the cart modal
     The return is the table wrapped in div.show-cart-tab-wrapper.  An
     optional id attribute can be passed.  If i is not an array, or
     has no items, a default message is provided instead.

     i = an array of objects holding the cart rows, defaults to current items
     id = an optional id attribute, defaults to show-cart-tab-items or checkout-tab-items
     is_checkout = boolean indicating if the current view is checkout
     */
  C.generateTable = function(i,id,is_checkout) {
    var tid = id || (is_checkout ? 'checkout-tab-items' : 'show-cart-tab-items');
    i = i || this.items;
    this.items = i;
    if (tid.substr(0,1)=='#') { tid = tid.substr(1); }
    var content = $('<table><thead/><tbody/></table>')
                      .attr('id',tid)
                      .wrap('<div class="show-cart-tab-wrapper"/>')
                      .parent(),
        t = '',
        body = content.find('tbody')
        ;
    if ($.isArray(i) && i.length && this.is_loaded) {
      if (is_checkout) {
        content.find('thead')
               .append($('<th>Order&nbsp;Details</th>').addClass('checkout-summary-full-descript'))
               .append($('<th>Item&nbsp;Price</th>').addClass('checkout-summary-price'))
               .append($('<th>Qty</th>').addClass('checkout-summary-quantity'))
               .append($('<th>Total</th>').addClass('checkout-summary-subtotal'));
      }
      for (var count=0; count < i.length; count++) {
        t = C.generateRow(i[count],is_checkout);
        body.append(t);
      }
    } else {
      body.append(
          $('<td/>').html('There are no items in your cart')
                    .wrap('<tr/>')
                    .parent()
                    .attr('id','show-cart-tab-no-items')
      );
    }
    return content
  }

  /* Create the totals table for the cart modal
     Returns the table wrapped in div.show-cart-totals-wrapper.  An
     optional id attribute can be passed.  Any total datapoint not
     found in i will be set to '0.00'.

     i = an object containing the datapoints, e.g., {total:35.23}
     id = an optional id attribute, defaults to show-cart-tab-totals
     is_checkout = boolean indicating if the current view is checkout
     */
  C.generateTotals = function(i,id, is_checkout) {
    i = i || this.totals;
    [ 'delivery','item_count','subtotal','tax','total' ].forEach(function(v,k){
      if (!Number(i[v])) { i[v]=0; }
      i[v] = i[v].toFixed(2);
    });
    var dispkeys = [],
        tidbit = is_checkout ? 'checkout-' : 'show-cart-';
        tid = id || tidbit+'tab-totals',
        ret = $('<div/>').addClass(tidbit+'totals-wrapper'),
        tb = $('<table><thead/><tbody/></table>').attr('id',tid),
        rows = {
                 subtotal:     { label:'Subtotal',           val:i.subtotal, order:1 },
                 discountcode: { label:'Code&nbsp;Discount', val:i.code,     order:2 },
                 delivery:     { label:'Delivery',           val:i.delivery, order:3 },
                 tax:          { label:'Tax',                val:i.tax,      order:4 },
                 tip:          { label:'Delivery&nbsp;Tip',  val:i.tip,      order:5 },
                 total:        { label:'Total',              val:i.total,    order:6 }
               }
        ;
    if (!is_checkout) {
      rows.discountcode.order=0;
      rows.tip.order=0;
    }
    if (!rows.discountcode.val) {
      rows.discountcode.order=0;
    }
    if (rows.tip.order) {
      rows.tip.label += '<a href="#" class="do-i-need-to-tip-help">Do I need to tip?</a>';
      rows.tip.val = '<input type="text" placeholder="0.00" value="' +
                     (rows.tip.val ? rows.tip.val : '') + '" id="checkout-tip-input" />';
    }
    for (var xx in rows) {
      if (rows[xx].order) {
        dispkeys.push([xx, rows[xx], rows[xx].order]);
      }
    }
    dispkeys.forEach(function(v,k){
      tb.append( $('<tr/>')
                    .append($('<td/>').addClass('cart-totals-label').attr('id',v[0]+'-label').html(v[1].label))
                    .append($('<td/>').addClass('cart-totals-currency').attr('id',v[0]+'-currency').html('$'))
                    .append($('<td/>').addClass('cart-totals-value').attr('id',v[0]+'-value').html(v[1].val))
      );
    });
    ret.append(tb);
    return ret;
  }

  /* Retrieves current cart contents, including totals, etc.

     cb = callback to execute after handlerGetCartContents
     */
  C.getContents = function(cb) {
    this.is_loaded;
    var o = { data: $.param({requestType:'cart-content'}), complete: [C.handlerGetContents] };
    if (cb) { o.complete.push(cb); }
    D.doAjax('cartcontent', o);
  }

  /* Retrieves current reorder products

     cb = callback to execute after handlerGetCartContents
     */
  C.getReorder = function(cb) {
    this.is_loaded;
    var o = { data: $.param({requestType:'cart-reorder'}), complete: [C.handlerGetContents] };
    if (cb) { o.complete.push(cb); }
    D.doAjax('reorder', o);
  }

  /* handler for deleting a single cart item

     r = a jQuery response object
     */
  C.handlerDeleteItem = function(r) {
    var cartid = Number(r.responseJSON.cartid).toFixed(0);
    if (cartid) {
      var table = $('tr[data-cartid="'+cartid+'"]').closest('table').parent();
      $('tr[data-cartid="'+cartid+'"]').remove();
      C.updateIcon();
      if (table.children('tbody').children().length < 1) { C.getContents(D.populateCartModal); }
    }
  }

  /* handles return from a request for cart contents
     This function will organize the return data into DJQ.cart.
     Additional callbacks can fire to act on that data.

     r = a jQuery response object
     */
  C.handlerGetContents = function(r) {
    var j = r.responseJSON.cart;
    C.items = j.items;
    C.totals = { delivery:j.delivery,
                 item_count:j.item_count,
                 subtotal:j.subtotal,
                 tax: j.tax,
                 total: j.total
               }
    C.is_loaded = true;
  }

  /* event handler for cart icon totals return
     Parses the response and updates any elements with .cart-checkout-button

     r = a jQuery response object
     */
  C.handlerUpdateIcon = function(r) {
    var n = Number(r.responseJSON.cart_count),
        t = Number(r.responseJSON.cart_total).toFixed(2);
    if (!t) { t=''; }
    $('.cart-checkout-button .cart-total-items').html(n);
    $('.cart-checkout-button .cart-total-amt').html(t);
  }

  /* update the cart/checkout button with correct totals */
  C.updateIcon = function() {
    var o = { data:$.param({requestType:'cart-totals'}), complete:C.handlerUpdateIcon };
    D.doAjax('carticon',o);
  }

})(jQuery, window);