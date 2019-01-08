/* CWD Utilities (ama39, last update: 4/2/17)
   - 1. Headline Autoscale (scales a single-line page headline to the full width of its container, updated on window resize)
   - 2. Justified Navigation (sizes a single line of nav buttons evenly in their container)
   - 3. Floating Navigation (main navigation "attaches" to the top of the screen when scrolled off page)
   - 4. Main Nav Dropdowns (script support for dropdown menus in the main navigation)
   - 5. Content Tabs (turns an ordered or unordered list into a set of slides with tabbed navigation) -- e.g., <ul class="content-tabs">
   - 6. Expander (turns heading + div pairs into an expand/collapse system with nesting based on heading level)
   - 7. Mobile Expander (similar to the standard expander, but intended to create single heading + div pairs that are only active at sub-tablet sizes (used, for example, by section navigation))
   - 8. Empty Sidebar Helper (clears whitespace from empty sidebar regions to allow use of the :empty pseudo class in CSS)
   - 9. Mobile Table Helper (allows tables or other block elements to scroll horizontally on small devices, apply via .mobile-scroll class)
   - 10. Custom Section Navigation Heading (a simple function for changing the "In this section" heading text) -- can be called from anywhere (e.g., a Drupal template, based on field data)
   ------------------------------------------------------------------------- */

var mobile_breakpoint = 959; // viewport pixel width at which mobile nav appears (should match the media query in the project's css)
var mobile_expander_breakpoint = 767; // viewport pixel width at which mobile expanders appear (e.g., section nav)

if (!Date.now){Date.now = function now(){return new Date().getTime();};} // legacy Date method shim

// 1. Headline Autoscale ---------------------------------------------------

// Preferences
var max_size = 72; // maximum font size (in px), prevents small titles from growing to alarming sizes!
var min_window_size = 0; // if set above 0, autoscale will cease below the specified viewport size (typically handing off control to a CSS media query) 

var base_size;
var base_width;
var safari = navigator.vendor != null && navigator.vendor.indexOf("Apple")==0 && /\sSafari\//.test(navigator.userAgent); // Safari rounds its font sizes, so some extra care is needed
var msie = document.documentMode;

jQuery(document).ready(function($) {	
		
	// Window Size Tracking
	function resizeChecks() {
		
		// Refresh Headline Autoscale 
		if ($(window).width() > min_window_size) {
			$('.autosize-header #site-titles h1').addClass('autoscale');
			var multiplier = $('#site-titles').innerWidth() / base_width;
			//console.log(multiplier + ' --- (base_size: '+base_size+', base_width: '+base_width+', container_width: '+$('#site-titles').width()+')');
			if (multiplier > 0) {
				var new_size = base_size * multiplier;
				if (new_size > max_size) {
					new_size = max_size;
				}
				else if (safari) {
					new_size = Math.floor(new_size) - 1;
				}
				$('.autosize-header #site-titles h1').css('font-size',new_size+'px');
			}
		}
		else {
			$('.autosize-header #site-titles h1').removeAttr('style').removeClass('autoscale');
		}
		
		// Mobile Nav
		if ($(window).width() <= mobile_breakpoint) {
			$('body').addClass('mobile'); // mobile nav breakpoint
		}
		else {
			$('body').removeClass('mobile');
			$('#main-navigation li.parent').removeClass('open');
			$('#main-navigation, #mobile-nav-dimmer').removeAttr('style');
		}
		// Mobile Expanders
		if ($(window).width() > mobile_expander_breakpoint) {
			$('.mobile-expander-heading').removeClass('open');
		}
	}
	
	
	// 1. Homepage Headline Autoscale -----------------------------------------
	$('.autosize-header #site-titles h1').wrapInner('<span class="autoscale-inline"></span>');
	base_size = parseInt($('#site-titles h1').css('font-size'));
	base_width = $('#site-titles h1 .autoscale-inline').width();
	$(window).resize(resizeChecks);
	resizeChecks();
	
	
	// 2. Justified Navigation ------------------------------------------------
	var nav_count = $('.nav-justified #main-navigation ul').first().children('li').length;
	if (nav_count > 0) {
		var nav_width = 100 / nav_count;
		$('.nav-justified #main-navigation ul').first().children('li').css( 'width',nav_width+'%');
	}
	
	
	// 3. Floating Navigation -------------------------------------------------
	// (NYI)
	
	
	// 4. Main Nav Dropdowns --------------------------------------------------
	$('#main-navigation li.parent > a').wrapInner('<span></span>').append('<span class="fa fa-caret-down"></span>'); // wrap text in a span and add dropdown caret icons
	$('#main-navigation li.parent li.parent > a .fa').removeClass('fa-caret-down').addClass('fa-caret-right'); // change sub-dropdown caret icons
	$('#main-navigation li.parent > ul').each(function(){
		$(this).css('min-width',$(this).parent('li').width()+'px' ); // smart min-width to prevent dropdown from being narrower than its parent
	});
	$('#main-navigation li.parent li.parent > ul').removeAttr('style'); // reset min-width to allow smaller submenus
	$('#main-navigation li.parent').hover(function(){
		// horizontal edge-detection
		var submenu_offset = $(this).children('ul').offset();
		if ( submenu_offset.left + $(this).children('ul').width() > $(window).width() ) {
			$(this).children('ul').addClass('flip');
		}
	}, function() {
		$(this).children('ul').removeClass('flip');
	});
	
	// Mobile Navigation
	$('#main-navigation li.parent > a .fa').click(function(e) {
		e.preventDefault();
		if ( $('body').hasClass('mobile') ) {
			$(this).closest('.parent').toggleClass('open');
		}
	});
	var main_nav_focus_target = $('#mobile-nav').attr('href');
	$('#mobile-nav').click(function(e) {
		e.preventDefault();
		$('#main-navigation li.parent').removeClass('open');
		$('#main-navigation, #mobile-nav-dimmer').fadeIn(100,function() {
			$(main_nav_focus_target).focus();
		});
	});
	$('#mobile-home').after('<a id="mobile-close" href="#"><span class="hidden">Close</span></a>');
	$('#mobile-close').click(function(e) {
		e.preventDefault();
		$('#main-navigation, #mobile-nav-dimmer').fadeOut(100,function() {
			$('#main-navigation li.parent').removeClass('open');
		});
	});
	$('#main-navigation').before('<div id="mobile-nav-dimmer"></div>');
	$('#mobile-nav-dimmer').click(function(e) {
		$('#mobile-close').trigger('click');
	});
	
	
	// 5. Content Tabs --------------------------------------------------------
	$('.content-tabs').each(function(){
		// prepare class options to share with tab navigation 
		var tab_classes = 'tabs-nav';
		if ( $(this).hasClass('tabs-classic') ) {
			tab_classes += ' tabs-classic';
		}
		if ( $(this).hasClass('tabs-mobile-expand') ) {
			tab_classes += ' tabs-mobile-expand';
		}
		if ( $(this).hasClass('tabs-mobile-accordion') ) {
			tab_classes += ' tabs-mobile-accordion';
		}
		if ( $(this).hasClass('tabs-numbered') ) {
			tab_classes += ' tabs-numbered';
		}
		if ( $(this).hasClass('tabs-numbers-only') ) {
			tab_classes += ' tabs-numbers-only';
		}
		// generate navigation
		$(this).before('<nav class="'+tab_classes+'"></nav>').addClass('scripted').children('li').each(function(i){
			var tab_title = $(this).find('h1,h2,h3,h4,h5,h6').first().text();
			var tab_id = 'tab-' + Math.floor(Math.random()*26) + Date.now(); // generate unique ID to allow links to target their tabs for better screen reader accessibility
			var tab_number = '';
			var tab_labelbefore = '';
			var tab_labelafter = '';
			if ( $(this).parent().hasClass('tabs-numbers-only') ) {
				tab_number = (i+1) + ' ';
				tab_labelbefore = '<span class="hidden">(';
				tab_labelafter = ')</span>';
			}
			else if ( $(this).parent().hasClass('tabs-numbered') ) {
				tab_number = (i+1) + '. ';
			}
			$(this).parent().prev('nav').append('<a href="#'+tab_id+'">'+ tab_number + tab_labelbefore + tab_title + tab_labelafter + '</a>');
			$(this).attr('id',tab_id).attr('tabindex','-1').hide();
		});
		$(this).children('li').first().show();
	});
	// tab navigation button events
	$('.tabs-nav').each(function(){
		var tabs = $(this).next('.content-tabs');
		$(this).children('a').first().addClass('active');
		$(this).children('a').click(function(e) {
			e.preventDefault();
			$(tabs).find('li').hide();
			$(tabs).find('li').eq( $(this).index() ).show();
			$(tabs).prev('nav').find('a').removeClass('active');
			$(this).addClass('active');
			$($(this).attr('href')).focus();
		});
	});
	
	// 6. Expander ------------------------------------------------------------
	$('.expander').addClass('scripted').find('h2, h3, h4, h5, h6').each(function(i) {
		if ($(this).next('div').length > 0) {
			$(this).addClass('sans expander-heading').prepend('<span class="fa fa-plus-square-o"></span>');
			$(this).click(function(e) {
				$(this).toggleClass('open');
			});
		}
	});
	$('.expander').each(function() {
		if ($(this).find('.expander-heading').length > 2) {
			var all_expanded = false;
			$(this).prepend('<a href="#" class="expand-all">Expand all</a>');
			$(this).children('.expand-all').click(function(e) {
				e.preventDefault();
				if (!all_expanded) {
					$(this).parent().find('.expander-heading').addClass('open');
					$(this).addClass('open');
					all_expanded = true;
					$(this).text('Close all');
				}
				else {
					$(this).parent().find('.expander-heading').removeClass('open');
					$(this).removeClass('open');
					all_expanded = false;
					$(this).text('Expand all');
				}
			});
		}
	});
	
	// 7. Mobile Expander -----------------------------------------------------
	$('.drupal #sidebar-top nav, nav.nav-body').addClass('mobile-expander').prepend('<h1 class="sans nav-heading">In this section<span class="punc">:</span></h1>');
	$('.drupal.page-search-site #sidebar-top nav .nav-heading').addClass('hidden').html('Filter results<span class="punc">:</span>');
	$('.mobile-expander').each(function() {
		if ($(this).children('h1, h2, h3, h4, h5, h6').length > 0) {
			var expand_header = $(this).children('h1, h2, h3, h4, h5, h6').first();
			$(expand_header).nextAll().wrapAll('<div class="mobile" />');
			$(expand_header).addClass('mobile-expander-heading').prepend('<span class="fa fa-chevron-down"></span>').click(function(e) {
				e.preventDefault();
				if ($(window).width() <= mobile_expander_breakpoint) {
					$(this).toggleClass('open');
				}
			});
		}
	});
	
	// 8. Empty Sidebar Helper ------------------------------------------------
	$('.secondary').each(function() {
		if (msie != 8 && msie != 7) {
			if ( !$(this).html().trim() ) {
				$(this).empty();
			}
		}
	});
	
	// 9. Mobile Table Helper -------------------------------------------------
	$('.mobile-scroll').each(function() {
			$(this).wrap('<div class="table-scroller" />');
			if ( $(this).hasClass('large') ) {
				$(this).parent().addClass('large');
			}
	});
	$('.table-scroller').append('<div class="table-fader" />').bind('scroll touchmove', function() {
		$(this).find('.table-fader').remove(); // hide fader DIV on user interaction
	});
	
	
	// Window Load ------------------------------------------------------------
	$(window).load(function() {
		
		// Reinitialize Headline Autoscale (after remote webfonts load)
		$('.autosize-header #site-titles h1').removeAttr('style');
		base_width = $('#site-titles h1 .autoscale-inline').width();
		resizeChecks();
		
	});
	
});

// 10. Custom Section Navigation Heading -------------------------------------
function customSectionNavHeading(heading_text, hidden) {
	if (heading_text != '' && heading_text != 'default') {
		$('.nav-heading').html('<span class="fa fa-chevron-down"></span>' + heading_text + '<span class="punc">:</span>');
	}
	if (hidden == '1') {
		$('.nav-heading').addClass('hidden');
	}
}