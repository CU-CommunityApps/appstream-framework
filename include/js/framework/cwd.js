/* IWS Dynamic Components
   ------------------------------------------- */  


jQuery(document).ready(function($) {
	
	// Windows class
	if (navigator.appVersion.indexOf('Win') > -1) {
		$('body').addClass('win');
		if (navigator.appName.indexOf('Internet Explorer') > -1 || !!navigator.userAgent.match(/Trident\/7\./) ) {
			$('body').addClass('ie'); // includes ie11+
		}
	}
	// Android class
	if (navigator.userAgent.toLowerCase().indexOf("android") > -1) {
		$('body').addClass('android touch');
	}
	// iOS class
	if (navigator.userAgent.match(/iPhone|iPad|iPod/)) {
		$('body').addClass('ios touch');
	}
	
	PointerEventsPolyfill.initialize({selector:'*'}); // TODO: set this up and test in IE8,9

	// Search
	var mousedown = false;
	$('#search-button').click(function(e) {
		e.preventDefault();
		mousedown = true;
		$('#cu-search-band').toggleClass('open');
		$(this).toggleClass('open');		
		if ( $(this).hasClass('open') ) {
			$('#search-form-query').focus();
		}
		else {
			$(this).focus();
			mousedown = false;
		}
	});
	$('#cu-search input').focus(function() {
		if (!mousedown) {
			$('#cu-search-band, #search-button').addClass('open');
			mousedown = false;
		}
	});
	
	// Override iOS Auto-Zoom on Search Form
	var viewportmeta = document.querySelector('meta[name="viewport"]');
	var viewportmeta_initial = viewportmeta.content;
	$('.touch #search-form-query').focus(function() {
		viewportmeta.content = viewportmeta_initial + ', maximum-scale=1, user-scalable=no';
	}).blur(function() {
		viewportmeta.content = viewportmeta_initial;
	});

	
});