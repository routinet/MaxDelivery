$(function () {
  var outer = $('.outer-carousel'),
      carousel = $('.carousel');
  outer.on('init', function (e, slick, dir) {
    // just for testing
    slick.$slides.map(function (index) {
      //$(this).append(index);
    });
  });
  carousel.slick({dots:true, arrows:false});
});
