/* IT@Cornell Scripting (last update: 1/12/17)
   document.ready:
   - 1. Service Page: Article Listing
   - 2. Service Page: "Show More" Body Content
   - 3. Fade "Submit" Button for Page Feedback
   - 4. Homepage Alerts
   - 5. Homepage Slider and Mobile Version
   - 6. Knowledge Base Article: Downloads File Format and Size
   - 7. Knowledge Base Article: Dynamic Table of Contents
   - 8. Quick Links Scripting
   - 9. Homepage Service Categories
   - 10. Homepage Audience Tabs
   - 11. "Was this helpful?" active flag
   - 12. Comments Magic
   - 13. Enhance Solr Active Filters
   - 14. Override iOS Auto-Zoom on Search Form
   - 15. CCWiki Helper Script
   window.load:
   - 16. AddThis Accessibility Fix
   functions:
   - 17. Guide Navigation: Ordered vs. Unordered
   - 18. Guide Navigation: Sidebar vs. Main Body
   - 19. Drupal Search
   ------------------------------------------------------------------------- */

var service_page_article_count = 3; // On Service pages, the maximum number of articles to show under each Service Topic heading

jQuery(document).ready(function($) {	
	
	// 1. Service Page: Article Listing -------------------------------------------------------------
	$('body:not(".node-type-knowledge-base-article") .secondary .service-articles article ul').each(function() {
		if ($(this).children('li').length > service_page_article_count && $('main article h1, .pro-service-feature h1').first().text() != 'Custom Web Development' && $('main article h1, .pro-service-feature h1').first().text() != 'Custom Development' ) {
			$(this).children('li').each(function(i) {
				if (i >= service_page_article_count) {
					$(this).hide();
				}
			});
			$(this).after('<a class="view-more" href="' + $(this).closest('.views-field').prev('h4').children('a').attr('href') + '">More articles<span class="hidden"> in ' + $(this).parents('.views-field-view').prev('h4').text() + '</span>...</a>');
		}
	});
	// hide empty views
	$('body:not(".node-type-knowledge-base-article") .service-articles article').each(function() {
		if ($(this).find('ul').length == 0) {
			$(this).hide();
		}
	});
	
	// 2. Service Page: "Show More" Body Content ----------------------------------------------------
	// Searches for the "<!--break-->" comment and places a Show More button to display the full text.
	$('.node-type-service main article .field-name-body .field-item').contents().filter(function() {
        return this.nodeType === 8;
	}).each(function() {
		if ( $(this).get(0).nodeValue == 'break' ) {
			$(this).prev().append('&nbsp;&nbsp;<a class="view-all teaser" href="#" aria-hidden="true">Show More<span class="fa fa-chevron-right"></span></a>');
			$(this).prev('p').addClass('intro');
			$(this).nextAll().wrapAll('<div class="more-content hidden" tabindex="-1"></div>');
			$(this).prev().children('.view-all').click(function(e) {
				e.preventDefault();
				$(this).parent().next('.more-content').removeClass('hidden').hide().slideToggle(200); //.focus();
				$(this).fadeOut(100);
			});
		}
		
	});
	
	// 3. Fade "Submit" Button for Page Feedback ----------------------------------------------------
	$('#supplement .comments input').addClass('scripted').attr('disabled','true');
	$('#supplement .comments textarea').keyup(function() {
		if ( $(this).val().length > 0) {
			$('#supplement .comments input').addClass('reveal').removeAttr('disabled');
			$('#supplement .comments .captcha').addClass('reveal');
		}
		else {
			$('#supplement .comments input').removeClass('reveal').attr('disabled','true');
			$('#supplement .comments .captcha').removeClass('reveal');
		}
	});
	// also check on page load to handle captcha errors
	$('#supplement .comments textarea').each(function() {
		if ($(this).val().length > 0) {
			$('#supplement .comments input').addClass('reveal').removeAttr('disabled');
			$('#supplement .comments .captcha').addClass('reveal');
		}
	});
	
	// 4. Homepage Alerts
	$('#alerts, .secondary .view-network-alerts').each(function(){
		var alert_count = $('#alerts .node').length - 1;
		
		// convert machine date into friendly format
		$('#alerts .node, .secondary .view-network-alerts .node').each(function() {
			if ( !$(this).hasClass('more-alerts') && !$(this).hasClass('no-alerts') ) {
				var last_update = $(this).find('time').attr('datetime'); // datetime attribute style
				var last_update_js = last_update.replace(/\s+/g, 'T'); // JavaScript Date Object style
				var date_format_friendly = $.format.date(last_update_js, 'M/dd/yy, h:mm a'); // Requires jquery-dateFormat plugin
				$(this).find('time').text(date_format_friendly);
				// determine priority colors
				var type = $(this).find('.type').text().toLowerCase();
				if (type == "quick unplanned outage" || type == "performance issue") {
					$(this).addClass('medium');
				}
				else if (type == "scheduled service change") {
					$(this).addClass('low');
				}
			}
		});
		
		// mobile indicators
		if (alert_count > 0) {
			// most recent update
			var mobile_last_update = $('#alerts .node:first-of-type time').attr('datetime'); // datetime attribute style
			var mobile_last_update_js = mobile_last_update.replace(/\s+/g, 'T'); // JavaScript Date Object style
			var mobile_date_format = $.format.date(mobile_last_update_js, 'M/dd, h:mm a'); // Requires jquery-dateFormat plugin
			$('#alerts-mobile h2').append(' <span class="counter">' + alert_count + '</span>');
			$('#alerts-mobile p').append(' <time datetime="' + mobile_last_update + '">' + mobile_date_format + '</time>');
		}
		else {
			$('#alerts-mobile h2').append(' <span class="none-active">(none active)</span>');
		}
		
		// design tweaks
		if (alert_count == 0) {
			$('#alerts .no-alerts').show();
			$('#alerts .more-alerts').hide();
		}
		if (alert_count == 0 || alert_count == 1) {
			$('#alerts').addClass('single');
		}
	});
	
	
	// 4.a :-) "Edit Content" Tabs and Comments toggles
	// Tabs
	$('.tabs-content').hide();
	$('.show-tabs a').click(function(e) {
		e.preventDefault();
		$(this).toggleClass('open');
		$('.tabs-content').slideToggle(200);
	});
	// Comments
	$('.comment-wrapper').hide();
	$('.show-comments a').click(function(e) {
		e.preventDefault();
		$(this).toggleClass('open');
		$('.comment-wrapper').slideToggle(200);
	});
	
	// 5. Mobile Slider Position --------------------------------------------------------------------
	var slider_position = 'desktop';
	$(window).resize(sliderPosition);
	function sliderPosition() {
		if (slider_position == 'desktop' && $(window).width() <= 568) {
			$('.home #feature').insertAfter('#alerts').prepend('<div class="stunt-double"></div>').addClass('band feature-mobile');
			slider_position = 'mobile';
		}
		else if (slider_position == 'mobile' && $(window).width() > 568) {
			$('.home #feature .stunt-double').remove();
			$('.home #feature').prependTo('#site-header > .band.feature').removeClass('band feature-mobile');
			slider_position = 'desktop';
		}
	}
	sliderPosition();
	
	// 6. Knowledge Base Article: Downloads File Format and Size ------------------------------------
	$('#article-meta .file a').wrapInner('<span class="deco"></span>').after('<span class="meta">Document</span>');
	$('#article-meta .file a').each(function() {
		if ($(this).attr('type').indexOf('image') > -1) {
			$(this).next('.meta').text('Image'); // jpeg, gif, png
		}
		else if ($(this).attr('type').indexOf('application/pdf') > -1) {
			$(this).next('.meta').text('PDF'); // pdf
		}
		// TODO: add more formats
		
		// calculate file size from 'type'
		if ($(this).attr('type').indexOf('length=') > -1) {
			var c_bytes = $(this).attr('type').split('length=')[1];
			var c_kbytes = Math.ceil(c_bytes/1024);
			var c_mbytes = Math.round((c_bytes/1048576 + 0.00001) * 100) / 100; // round to two decimal places
			var c_size_meta = '';
			if (c_bytes < 1048576) {
				c_size_meta = c_kbytes + ' KB';
			}
			else {
				c_size_meta = c_mbytes + ' MB';
			}
			$(this).next('.meta').append(' &nbsp;' + c_size_meta);
		}
	});
	
	// 7. Knowledge Base Article: Dynamic Table of Contents -----------------------------------------
	if ( $('body').hasClass('node-type-knowledge-base-article') ) {
		if ( $('main .field-name-body h2:not(".element-invisible")').length > 1 ) {
			var toc_buddy = $('main h1').first();
			if ( $('.service-list-heading + hr').length > 0 ) {
				toc_buddy = $('.service-list-heading + hr').first();
			}
			else if ( $('.article-summary').length > 0 ) {
				toc_buddy = $('.article-summary').first();
			}
			$(toc_buddy).after('<div id="section-toc"><h2>In this article:</h2><ol></ol></div>');
			$('main .field-name-body h2:not(".element-invisible")').each(function(i) {
				var link_label_process = $(this).clone();
				$(link_label_process).find('span.ext, span.email').remove(); // remove invisible text from automated external link icons
				var link_label = $(link_label_process).text().trim();
				// remove number prefix from labels if present
				if ( !isNaN(link_label.charAt(0)) ) {
					if ( link_label.charAt(1) == '.' ) {
						link_label = link_label.substr(2).trim();
					}
					else if ( link_label.charAt(2) == '.' ) {
						link_label = link_label.substr(3).trim();
					}
				}
				$(this).attr('id','section-'+(i+1)).addClass('toc').after('<a href="#main" class="back-to-toc" title="Back to Top"><span class="hidden">Back to Top</span></a>');
				$('#section-toc ol').append('<li><a href="#section-'+(i+1)+'">'+link_label+'</a></li>');
			});
			$('.back-to-toc').click(function(e) {
				$('html, body').animate({
					scrollTop: 0
				}, 400, 'easeInOutQuad', function() {
					$('#main').focus();
				});
				return false;
			});
		}
	}
	
	// 8. Quick Links Scripting ---------------------------------------------------------------------
	// Handle mouse and focus events to create custom, keyboard-accessible dropdown menus
	
	window['peace_between_focus_and_mouse'] = true; // a little on/off switch to help reconcile conflicting focus and mouse events
	$('body').append('<div id="quick-click"></div>'); // an invisible overlay (behind the menu) to accept mouse clicks anywhere on screen
	$('#quick-links li.parent').addClass('scripted'); // add a class to confirm that JavaScript is enabled (in case we want CSS that only applies when JS is active)
	
	// Find menus and assign them an ID and a global variable for easy targeting (e.g., "menu1", "menu2", etc...)
	$('#quick-links li.parent > a + ul').each(function(n) {
		window['menu' + n] = $(this);
		$(this).prepend('<a href="#" class="popup-close" tabindex="0" aria-label="Close Button"></a>');
	});
	
	// Process buttons
	$('#quick-links li.parent > a').each(function(n) {
		$(this).attr('data-menu-id',n); // connect buttons to menu IDs
	}).click(function(e) {
		e.preventDefault(); // prevent default anchor link behavior
	}).mousedown(function(e) {
		e.preventDefault();
		// Toggle menu and invisible overlay
		$(this).toggleClass('open');
		if ($(this).hasClass('open')) {
			$('#quick-links .open').removeClass('open');
			$(this).addClass('open')
			$('#quick-click, #popup-close').show();
		}
		else {
			$('#quick-click, #popup-close').hide();
		}
		// Edge detection (calculates when the menu is being cut off by the bottom of the browser window and attempts to compensate) 
		if (peace_between_focus_and_mouse) { // do not run when triggered by a blur() event
			
			window['menu' + $(this).attr('data-menu-id')].removeAttr('style'); // clear previous adjustments
			var offset = window['menu' + $(this).attr('data-menu-id')].offset(); // request menu offset
			var menu_bottom = offset.top - $(window).scrollTop() + window['menu' + $(this).attr('data-menu-id')].outerHeight(); // calculate the position of the bottom of the menu, accounting for page scroll and menu height
			// If the bottom of the menu is below the bottom of the window, move it up accordingly (adjusting margin-top)
			// The menu's top margin is 4px normally, but the calculations are offset by 2 to allow 2px of space between the menu and the bottom of the window
			if ( menu_bottom + 2 > $(window).height() ) {
				var diff = menu_bottom - $(window).height();
				window['menu' + $(this).attr('data-menu-id')].css('margin-top',(2-diff)+'px');
			}
		}
	}).focus(function(e) {
		// Button focus event (trigger mousedown code if the menu is not already open)
		if (!$(this).hasClass('open')) {
			$(this).trigger('mousedown');
		}
	}).blur(function(e) {
		// Button focus event (trigger mousedown code if the menu is closed)
		// However, the edge detection code is skipped for this event...
		if ($(this).hasClass('open')) {
			peace_between_focus_and_mouse = false; // prevents edge detection from updating
			$(this).trigger('mousedown');
			peace_between_focus_and_mouse = true; // give peace another chance
		}
	});
	
	// Invisible overlay and Close button
	$('#quick-click').mousedown(function(e) {
		e.preventDefault();
		$('#quick-links .open').removeClass('open');
		$(this).hide();
	});
	$('.popup-close').mousedown(function(e) {
		e.preventDefault();
		$('#quick-links .open').removeClass('open');
		$('#quick-click').hide();
	}).click(function(e) {
		e.preventDefault();
	});
	
	// Menu link focus events
	$('#quick-links li.parent ul a').focus(function(e) {
		$('#quick-links .open').removeClass('open');
		$(this).closest('ul').prev('a').addClass('open');
	}).blur(function(e) {
		$(this).closest('ul').prev('a').removeClass('open');
	});
	
	
	// 9. Homepage Service Categories ---------------------------------------------------------------
	// Handle mouse and focus events to create custom, keyboard-accessible tabs with submenus
	
	// Category mouse and focus events
	$('#it-services > ul > li > a').on('mousedown focus', function(e) {
		e.preventDefault();
		$('#it-services .active').removeClass('active');
		$(this).addClass('active');
		refreshCategoryHeight();
	}).click(function(e) {
		e.preventDefault();
	});
	
	// Submenu link focus event
	$('#it-services ul ul li a').focus(function(e) {
		$('#it-services .active').removeClass('active');
		$(this).closest('ul').prev('a').addClass('active');
		refreshCategoryHeight();
	});
	
	// Activate the first Category at page load
	$('#it-services > ul > li > a').first().trigger('mousedown');
	
	// Increase container height to fit longer submenus if necessary (since they are positioned absolutely, they cannot increase the height themselves)
	function refreshCategoryHeight() {
		$('#it-services > ul').removeAttr('style');
		var cats_height = $('#it-services > ul').height();
		var menu_height = $('#it-services .active').first().next('ul').height();
		//var cats_count = $('#it-services > ul').children('li').length;
		//var menu_count = $('#it-services .active').first().next('ul').children('li').length;
		
		if ( menu_height > cats_height ) {
			//var height_modifier = 4 * (menu_count - cats_count);
			$('#it-services > ul').height(menu_height);
			//console.log('height_modifier --> ' + height_modifier);
		}
		//else {
		//	$('#it-services > ul').removeAttr('style');
		//}
	}
	// Recalculate on window resize
	if ( $('body').hasClass('home') ) {
		$(window).resize(refreshCategoryHeight);
	}
	
	
	// 10. Homepage Audience Tabs -----------------------------------------------------------------
	// Handle mouse and focus events to create custom, keyboard-accessible tabs
	$('#pages-for a').click(function(e) {
		e.preventDefault();
		if ( $(this).hasClass('active') ) {
			$('#pages-for .active').removeClass('active');
			$('#audience').removeClass('open');
		}
		else {
			$('#pages-for .active').removeClass('active');
			$(this).addClass('active');
			$('#audience').addClass('open');
		}
		$('#audience .audience').hide();
		$('#audience .' + $(this).parent('li').attr('class')).show();
		$('#audience').removeClass('students faculty staff itpros alumni');
		$('#audience').addClass($(this).parent('li').attr('class'));
	});
	//$('#pages-for .alumni a').trigger('click'); // debug
	
	
	// 11. "Was this helpful?" active flag --------------------------------------------------------
	$('.rate-button.flag').click(function(){
		$(this).addClass('flagged');
		$(this).siblings('.flag').removeClass('flagged');
	});
	
	
	// 12. Comments Magic -------------------------------------------------------------------------
	// Mark "major" comments with a CSS class for styling
	$('.field-name-field-comment-level .field-item').each(function(){
		if ( $(this).text() == 'Major' ) {
			$(this).addClass('major');
		}
	});
	// Detect the presence of comments and new comments and display an indicator
	if ($('#comments').length > 0) {
		var s_or_no_s = '';
		var comment_count = $('#comments .comment').length;
		var new_comment_count = $('#comments .new').length;
		if (comment_count > 0) {
			if (comment_count > 1) {
				s_or_no_s = 's';
			}
			$('.show-comments').prepend('<span class="comment-badge">' + comment_count + ' comment' + s_or_no_s + '</span>');
		}
		if (new_comment_count > 0) {
			$('.comment-badge').append(' <span class="comment-new">(' + new_comment_count + ' new)</span>');
		}
	}
	
	// 13. Enhance Solr Active Filters ------------------------------------------------------------
	$('.block-apachesolr-search .item-list li, .block-facetapi .item-list li, .block-apachesolr-stats .item-list li').each(function() {
		if ( $(this).find('.facetapi-active, .active').length > 0 ) {
			$(this).addClass('active');
		}
	});
	
	// 14. Override iOS Auto-Zoom on Search Form --------------------------------------------------
	var viewportmeta = document.querySelector('meta[name="viewport"]');
	var viewportmeta_initial = viewportmeta.content;
	$('.touch #quick-search-query, .touch #edit-keys').focus(function() {
		viewportmeta.content = viewportmeta_initial + ', maximum-scale=1, user-scalable=no';
	}).blur(function() {
		viewportmeta.content = viewportmeta_initial;
	});
	
	// 15. CCWiki Helper Script -------------------------------------------------------------------
	if ( $('body').hasClass('view-page-services_topics_kbas') ) {
		if (window.location.search.substring(1) == 'wikihelp') {
			$('.views-field-field-summary, .views-exposed-form, .view-footer').hide();
			$('main .views-field-title a, .secondary .views-field-title a').each(function() {
				var c_url = $(this).attr('href');
				var c_title = $(this).text();
				$(this).parent().html('<small>#[http://it.cornell.edu' + c_url + ' ' + c_title + ']</small>');
			});
			$('.view-topics-kbas h4').each(function() {
				$(this).html( $(this).text() );
			});
			$('.service-articles').removeClass('service-articles');
			$('.secondary .view-kba-service').removeClass('view-kba-service');
		}
	}
	
	
	// Window Load Event
	$(window).load(function() {

		// 16. AddThis Accessibility Fix -----------------------------------------------------------
		// Remove problematic tabindex attributes from the AddThis widget
		$('#atstbx a').removeAttr('tabindex');
		remove_this = setTimeout(function() {
			if ( $('#atstbx').length > 0 ) {
				$('#atstbx a').removeAttr('tabindex');
				clearTimeout(remove_this);
			}
		}, 500);

	});
	
});


// 17. Guide Navigation: Ordered vs. Unordered ---------------------------------------------------
function guideOrder(order) {
	if (order == 'ordered') {
		$('.menu-name-menu-guides > ul > li > a').each(function(i) {
			$(this).text((i+1) + '. ' + $(this).text());
		});
	}
}

// 18. Guide Navigation: Sidebar vs. Main Body ---------------------------------------------------
function guideNavLocation(location) {
	if (location == 'body') {
		$('main .region-sidebar-nav').first().parents('nav').insertBefore($('main .field-name-body').first());
	}
}

// 19. Drupal Search -----------------------------------------------------------------------------
function headerSearch(e,query,isquick) {
	e.preventDefault();
	
	if (query.elements['search'] !== undefined) {
		var search = query.elements['search'].value;
	}
	else {
		var search = query.elements['search-form-query'].value;
	}
	
	if (isquick) {
		var url = "/search/google/" + encodeURIComponent(search);
		window.location = url;
		return false;
	}
	else {
		var radios = jQuery('#cu-search .search-filters input[type=radio]');
		for (var i = 0; i < radios.length; i++) {
			if(radios[i].value === "thissite" && radios[i].checked) {
				var url = "/search/google/" + encodeURIComponent(search);
				window.location = url;
				return false;
			}
			else if (radios[i].value === "cornell" && radios[i].checked) {
				var url = "http://www.cornell.edu/search/?q=" + encodeURIComponent(search);
				window.location = url;
				return false;
			}
		}
	}
}
