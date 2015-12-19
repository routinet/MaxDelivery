;
/* set jQuery into "no conflict" mode.  Makes debugging a little easier
   if this is commented, but should be uncommented for production
   */
//jQuery.noConflict();

(function ($,undefined) {

  /* onReady necessities */
  $(document).ready(function() {
    /* *********************************
     * Debug Hooks
     ********************************* */

    /* Hook to artificially toggle logged-in status */
    $('body').on('click','#toggle-login',function(e){
      $('body').toggleClass('not-logged-in is-logged-in');
    });

    /* *********************************
     * Hooks
     ********************************* */

    /* hook for main menu icon */
    $('body').on('click','.main-menu-icon',function(e){
      $("#top-container").toggleClass('visible-flyout');
      $('#main-menu-flyout').toggle(400);
    });

    /* hook to close flyouts from "back" buttons */
    $('body').on('click','.main-menu-flyout-tab .flyout-tab-header',function(e){
      $(e.target).closest('.main-menu-flyout-tab').popup("close");
    });

    /* hook to close filter flyouts */
    $('body').on('click','.filter-page .filter-page-close-button',function(e){
      $(e.target).closest('.filter-page').popup("close");
    });

    /* hook to fix feature headers to the side on scroll */
    $('#featured-lists').on('scroll',function(e){
      // for each header, set the parent position and dynamic padding
      $(e.target).find('.feature-box-header').each(function(k,v) {
        var scrolled = e.target.scrollLeft - v.parentElement.offsetLeft;
        if (scrolled > 0) {
          var new_pad = Math.abs(v.clientWidth > scrolled ? v.clientWidth - scrolled : 0);
          v.parentElement.style.paddingLeft=new_pad.toString()+'px';
          v.parentElement.style.position='static';
        } else {
          v.parentElement.style.paddingLeft='';
          v.parentElement.style.position='relative';
        }
      });
    });

    /* hook to keep the main menu flyouts positioned while scrolling */
    $(window).bind('scroll', function(e) {
      var val = 73 - Number($(this).scrollTop());
      $('.ui-popup-container').css('top',val+'px !important');
    });


    /* *********************************
     * Page initialization
     ********************************* */

    /* populate the page items with controls */
    var init_items = [ ['m_page_items','.is-page-item'],
                       ['cart_items','.is-cart-item'],
                     ];
    init_items.forEach(function(v,k) {
      var t = new DJQ.PageItems(v[0],v[1]).render();
    });

    /* initialize custom select boxes */
    var CSoptions = {
                      customCSS: { selectInnerSpan: { width:'initial' }, }
                    };
    $('.isCustomSelect').customSelect(CSoptions);

  });
})(jQuery);