/* CWD Modal Popups (ama39, last update: 4/19/16)
   - 
   ------------------------------------------------------------------------- */

/* Global Options -------------- */
var popup_shadow = true; // applies a subtle dropshadow (css class "dropshadow")
var popup_fadein_speed = 0.2; // speed of popup fade-in (in seconds)
var popup_max_width = 800; // max width of unconstrained popups (ID popups only)
var popup_max_height = 600; // max height of unconstrained popups (ID popups only)
var popup_proportion = 0.94; // size of unconstrained popups (0.94 = 94% window width and height)
var popup_resize_response = 0; // on window resize, controls how immediately the popup is recalculated (in milliseconds, 0 instructs the browser to resize as rapidly as possible, greater than 0 instructs the browser to only recalculate once at the end of the resize event(s) and after a delay of x milliseconds, set to 100 or more if performance on resize events is an issue)

/* Global Variables ------------ */
var popup_count = 0;
var popup_type = 'none';
var resize_popup;
var was_visible = false;
var viewportmeta = document.querySelector('meta[name="viewport"]');
var viewportmeta_initial = viewportmeta.content;
var popup_source;

popup_fadein_speed = popup_fadein_speed * 1000; // convert to milliseconds

/* -----------------------------------------------------------------------------------------
   Initialize Popups
   -----------------------------------------------------------------------------------------
   - applies to all links with the class "popup"
   - optionally accepts link attribute "data-popup-width"
   - optionally accepts link attribute "data-popup-height" (ignored by image popups)
-------------------------------------------------------------------------------------------- */

jQuery(document).ready(function($) {
	if ($(window).width() < 768) {
		$('.popup').addClass('popup-fullscreen'); // force fullscreen modals for mobile
	}
	function popups() {
		// Create #popup node and background dimmer ---------- 
		$('body').append('<div id="popup-background"></div><div id="popup-wrapper"><div id="popup" role="dialog" aria-labelledby="popup-anchor"></div></div>');
		$('#popup-wrapper').click(function(e) {
			$('#popup-close').trigger('click');
		});
		$(document).keyup(function(e) {
			if (e.keyCode == 27) { // escape key
				if ( $('#popup-wrapper:visible') ) {
					$('#popup-close').trigger('click');
				}
			}
		});
		if (popup_shadow) {
			$('#popup').addClass('dropshadow'); // apply dropshadow preference		
		}
	
		// Setup click events ----------
		$('.popup').each(function(n) {
			popup_count++;
			$(this).data('popupID',popup_count);
		
			var popup_content = $(this).attr('href');
			var popup_caption = $(this).attr('title');
			var popup_custom_width = $(this).attr('data-popup-width');
			var popup_custom_height = $(this).attr('data-popup-height');
			var popup_fullscreen = $(this).hasClass('popup-fullscreen');
		
			$(this).click(function(e) {
			
				e.preventDefault();
			
				popup_source = $(this);
			
				if ( $('html').hasClass('touch') ) {
					viewportmeta.content = viewportmeta_initial + ', maximum-scale=1, user-scalable=no'; // lock scale for mobile popups
				}
			
				if (popup_content != '' && popup_content != undefined) {	
				
					// apply fullscreen preference
					if (popup_fullscreen) {
						$('#popup').addClass('fullscreen');
					}
					else {
						$('#popup').removeClass('fullscreen');
					}
				
					$('#popup').removeClass('custom-width').removeClass('custom-height').removeAttr('style').empty().unbind();
				
					// determine content type (image, element by ID, or external iframe)
					var filetype = popup_content.substr(popup_content.lastIndexOf('.')).toLowerCase();
					if (filetype == '.jpg' || filetype == '.jpeg' || filetype == '.gif' || filetype == '.png') {
						popup_type = 'image';
						var img = new Image();
						img.onload = function() {
						
							$('#popup-wrapper').show(); // parent container must be visible for height calculations
						
							var this_width = img.width;
							if (popup_custom_width) {
								this_width = popup_custom_width;
							}
							$('#popup').removeClass('scroll').width(this_width).html('<img id="popup-image" width="'+img.width+'" height="'+img.height+'" src="'+popup_content+'" />');
						
							if (popup_caption != '' && popup_caption != undefined) {
								$('#popup').append('<p class="caption">'+popup_caption+'</p>');
							}
																		
							// detect scaled images
							var scaled_height = img.height;
							if (img.width != $('#popup-image').width()) {
								scaled_height = parseInt(scaled_height * ($('#popup-image').width() / img.width));
							}
							$('#popup-image').css({
								'width': $('#popup-image').width()+'px',
								'height': scaled_height+'px'
							});
						
							$('#popup').css('top', ($(window).height()/2 - $('#popup').outerHeight()/2).toString()+'px').click(function(e) {
								$('#popup-close').trigger('click');
							});
						
							$('#popup-wrapper').hide().fadeIn(popup_fadein_speed);
							$('#popup-image').css({
								'width': 'auto',
								'height': 'auto'
							});
							closeButton();
						}
						img.src = popup_content;
					
						$('#popup-background').show();
					
						// TODO: loading UI could go here (for slow connections)
					
					}
					else {
						if (popup_content.indexOf('#') == 0) {
							popup_type = 'id';
						
							$(popup_content).after('<div id="id-marker" />');
						
							// store original display state
							if ($(popup_content+':visible').length > 0) {
								was_visible = true;
							}
							else {
								was_visible = false;
							}
						
							if (!popup_fullscreen) {
								var contain_height = popup_max_height;
								if ($(window).height()*popup_proportion < contain_height) {
									contain_height = $(window).height()*popup_proportion;
								}
							
								var this_width = parseInt($(window).width()*popup_proportion);
								var this_height = contain_height;
								if (popup_custom_width) {
									$('#popup').addClass('custom-width');
									this_width = popup_custom_width;
								}
								if (popup_custom_height) {
									$('#popup').addClass('custom-height');
									this_height = popup_custom_height;
								}
								$('#popup').addClass('scroll').css('max-width',popup_max_width+'px').outerWidth(this_width).outerHeight(this_height).removeClass('fullscreen').css('top', ($(window).height()/2 - $('#popup').outerHeight()/2).toString()+'px');
							
							}
							$('#popup').click(function(e){e.stopPropagation()}).append($(popup_content).show());
							$('#popup-wrapper').fadeIn(popup_fadein_speed, function() {
								$('#popup-anchor').focus();
							});
							$('#popup-background').show();
						
						}
						else {
							popup_type = 'iframe';
												
							$('#popup').removeClass('scroll').html('<iframe src="' + popup_content + '" frameborder="0" scrolling="auto" />');
							$('#popup iframe').attr('src',$('#popup iframe').attr('src')); // clears IE iframe caching bug
						
							var this_width = parseInt($(window).width()*popup_proportion);
							var this_height = parseInt($(window).height()*popup_proportion);
							if (popup_custom_width) {
								$('#popup').addClass('custom-width');
								this_width = popup_custom_width;
							}
							if (popup_custom_height) {
								$('#popup').addClass('custom-height');
								this_height = popup_custom_height;
							}
							$('#popup').outerWidth(this_width).outerHeight(this_height);
						
							$('#popup').css('top', ($(window).height()/2 - $('#popup').outerHeight()/2).toString()+'px');
							$('#popup-wrapper').fadeIn(popup_fadein_speed);
							$('#popup-background').show();
						}
					
						closeButton(popup_content);
					}
				
					// refresh positioning and scale on resize
					if (!popup_fullscreen) {
						$(window).on('resize.popup',function() {
							if (popup_resize_response > 0) {
								clearTimeout(resize_popup);
								resize_popup = setTimeout(resizeDone, popup_resize_response);
							}
							else {
								resizeDone();
							}
						});
						function resizeDone() {
							if (popup_type == 'image') {
								$('#popup').css('top', ($(window).height()/2 - $('#popup').outerHeight()/2).toString()+'px');
							}
							else if (popup_type == 'id') {
								var contain_height = popup_max_height;
								if ($(window).height()*popup_proportion < contain_height) {
									contain_height = $(window).height()*0.94;
								}
								if ( !$('#popup').hasClass('custom-width') ) {
									$('#popup').outerWidth(parseInt($(window).width()*popup_proportion));
								}
								if ( !$('#popup').hasClass('custom-height') ) {
									$('#popup').outerHeight(contain_height);
								}
								$('#popup').css('top', ($(window).height()/2 - $('#popup').outerHeight()/2).toString()+'px');
							}
							else if (popup_type == 'iframe') {
								if ( !$('#popup').hasClass('custom-width') ) {
									$('#popup').outerWidth(parseInt($(window).width()*popup_proportion));
								}
								if ( !$('#popup').hasClass('custom-height') ) {
									$('#popup').outerHeight(parseInt($(window).height()*popup_proportion));
								}
								$('#popup').css('top', ($(window).height()/2 - $('#popup').outerHeight()/2).toString()+'px');
							}
						}
					}
				}
			});
		});
	}
	popups();
// End jQuery(document).ready
});


function closeButton(popup_content) {
	// Add Close Button
	$('#popup').prepend('<h2 id="popup-anchor" class="hidden" tabindex="-1">Popup Window (Press Escape to Exit)</h2><a href="#" id="popup-close" tabindex="0" aria-label="Close Button"></a>');
	$('#popup-close').click(function(e) {
		e.preventDefault();
		e.stopPropagation();
		$(window).unbind('resize.popup');
		$('#popup-wrapper, #popup-background').hide();
		if (popup_type == 'id') { // return page element to its native DOM position
			$('#id-marker').after( $(popup_content) );
			$('#id-marker').remove();
			if (!was_visible) {
				$(popup_content).hide();
			}
		}
		if ( $('html').hasClass('touch') ) {
			viewportmeta.content = viewportmeta.content = viewportmeta_initial; // unlock scale for mobile popups
		}
		$(popup_source).focus();
	});
}
