$(function () {
  var ocarousel = $('.outer-carousel'),
      icarousel = $('.inner-carousel');
  ocarousel.slick({dots:true, arrows:true});
  icarousel.slick({dots:false, arrows:false});
});
