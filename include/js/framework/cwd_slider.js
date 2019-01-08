/* CWD Image Slider (ama39, last update: 1/20/17)
   - ...
   - preloads images and creates "buffer" layers to allow cover placement and ensure smooth transitions
   - supports unlimited simultaneous sliders
   ------------------------------------------------------------------------- */

// Default Settings
var default_div = '#site-header'; // default background container
var default_caption_div = '#site-headline'; // default caption container
var default_slide_time = 8; // time between transitions (in seconds)
var default_transition_speed = 1; // speed of cross-fade (in seconds)
var default_autoplay = true; // if true, the slider will cycle through images on load (but will stop after user interaction)
var default_random_start = true; // if true, the slider will start on a random slide (instead of always starting at 1)
var default_caption_height = '8em'; // must be enough height to accomodate the tallest caption text (only for top-aligned captions)
var default_image_path = ''; // path to images (if not using absolute paths)
var default_bg_color = '#363f47'; // basic fill color behind images (may be visible briefly during page load)

// Global Variables
var slider_count = 0;
var captionless = true; // switched to false when captions are detected on any slide (applies a body class for adjusting the design)

// Navigation Options
var align = 'right'; // alignment: 'left' or 'right' (NYI)
var valign = 'top'; // vertical caption alignment: 'top' or 'bottom' (NYI)
var no_numbers = true; // disable numbers on slide buttons
var nextprev = true; // provide Next and Previous buttons



/* -----------------------------------------------------------------------------------------
   Initialize Slider
   -----------------------------------------------------------------------------------------
   - Generates and renders a slider with navigation and desired settings
   - All arguments are described above in "default settings"
   - Arguments are optional (they override the default settings) though 'div' and 'caption' will typically be included 
-------------------------------------------------------------------------------------------- */
function cwd_slider(div,caption,time,speed,auto,random,height,path,bg) {
	
	// instanced variables
	slider_count++;
	var sid = 's' + slider_count; // unique identifier prefix (e.g., 's1') - prepended to various IDs ("s1-slide-image1", "s1-slide-caption1", etc...)
	var image_array = window['image_array' + slider_count];
	var current_slide = 0;
	var slide_count = 0;
	var starting_slide = 0;
	var autoplaying = false;
	var slide_interval;
	var is_transitioning = false;
	
	jQuery(document).ready(function($) {
		
		// apply arguments or use defaults
		var image_div = div || default_div;
		var caption_div = caption || default_caption_div;
		var slide_time = time || default_slide_time;
		var transition_speed = speed || default_transition_speed;
		var caption_height = height || default_caption_height;
		var autoplay = auto || default_autoplay;
		var random_start = random || default_random_start;
		var image_path = path || default_image_path;
		var bg_color = bg || default_bg_color;
		
		// additional variables
		$(caption_div).attr('tabindex','-1').addClass('aria-target'); // set focus target for accessibility
		var caption_div_inner = caption_div + ' .caption-inner';
		slide_count = image_array.length || 0;
	
		// lock the height
		//if (valign == 'top') {
		//	$(caption_div).css('height',caption_height);
		//}
		
		// setup
		$(image_div).addClass('slider');
		$(image_div).css('background',bg_color); // background color
		$(caption_div).find('.caption-inner').remove(); // remove static caption if present
		$(caption_div).append('<div class="caption-inner"><a></a></div>'); // setup dynamic caption
	
		// build image set and preload
		for (i=0;i<slide_count;i++) {
			$(image_div).append('<div class="slide-buffer" id="'+sid+'-slide-buffer'+i+'"></div>');
			// slide data
			$('#'+sid+'-slide-buffer'+i).data('loaded',false); // <- load status
			$('#'+sid+'-slide-buffer'+i).data('heading',image_array[i][1]); // <- heading
			$('#'+sid+'-slide-buffer'+i).data('caption',image_array[i][2]); // <- caption
			$('#'+sid+'-slide-buffer'+i).data('link',image_array[i][3]); // <- link
			// load image
			$('#'+sid+'-slide-buffer'+i).css('background-image','url('+image_array[i][0]+')');
			// detect captions
			if (image_array[i][1].length > 0 || image_array[i][2].length > 0) {
				captionless = false;
			}
		}
		if (captionless) {
			$('body').addClass('slider-no-caption');
		}

		// activate first slide and start slider
		if (random_start == true) { // random start
			starting_slide = Math.floor(Math.random() * slide_count);
			if (starting_slide > slide_count) {
				starting_slide = slide_count;
			}
			current_slide = starting_slide;
		}
		changeSlide(starting_slide,false);
		if (slide_count > 1) {
			startSlider();
		}
		
		/* Start the slider and run autoplay timer (if autoplay is enabled)
		---------------------------------------------------------------------- */
		function startSlider() {
			// set up autoplay interval
			if (autoplay == true) {
				slide_interval = setInterval(slideTimer,(slide_time*1000));
			}
			$(image_div).addClass('animate');
			buildNav();
		}
		
		/* Interval function executed by autoplay timer
		---------------------------------------------------------------------- */
		function slideTimer() {
			// find next slide
			var next_slide = current_slide + 1;
			if (next_slide >= slide_count) {
				next_slide = 0;
			}
			// activate next slide
			changeSlide(next_slide,true);
		}

		/* Generate a button for each slide plus "Next" and "Previous"
		---------------------------------------------------------------------- */
		function buildNav() {
			var numbers = ' numbers';
			if (no_numbers) {
				numbers = ' no-numbers';
			}
			var nextprev_html = '';
			if (nextprev && slide_count > 1) {
				nextprev_html = '<div class="next-prev"><a class="prev" href="'+caption_div+'"><span class="hidden">Previous Slide</span><span class="fa fa-angle-left"></span></a><a class="next" href="'+caption_div+'"><span class="hidden">Next Slide</span><span class="fa fa-angle-right"></span></a></div>';
			}
			
			$(caption_div_inner).after('<div class="campaign-nav '+align+numbers+'"><h3 class="hidden">View Another Slide</h3>'+nextprev_html+'<ul class="list-menu sans"></ul></div>');
			$(image_div + ' .slide-buffer').each(function(i){
				$(caption_div + ' ul').append('<li><a href="'+caption_div+'"><span class="dot"><span class="num">'+(i+1)+'</span></span><span class="hidden">. '+$(this).data('heading')+'</span></a></li>');
			});
			$(caption_div + ' ul').children('li').eq(current_slide).children('a').addClass('active');
			
			$(caption_div + ' ul').find('a').each(function(i){
				$(this).click(function(e){
					e.preventDefault();
					if (!is_transitioning) {
						$(caption_div).focus();
			
						clearInterval(slide_interval);
						$(image_div).removeClass('animate');
						if (i != current_slide) {
							changeSlide(i,false);
						}
					}
				});
			});
			
			// next and previous buttons				
			$(caption_div + ' .next-prev a').click(function(e){
				e.preventDefault();
				if (!is_transitioning) {
					$(caption_div).focus();
		
					clearInterval(slide_interval);
					$(image_div).removeClass('animate');
		
					if ( $(this).hasClass('next') ) {
						current_slide++;
						if (current_slide >= slide_count) {
							current_slide = 0;
						}
					}
					else {
						current_slide--;
						if (current_slide < 0) {
							current_slide = slide_count-1;
						}
					}
					changeSlide(current_slide,false);
				}
			});

		}

		/* Change slide (with transition during autoplay or instant when clicked)
		---------------------------------------------------------------------- */
		function changeSlide(slide,include_transition) {
			var c_speed = transition_speed * 1000; // convert transition to milliseconds
			var c_quickspeed = transition_speed * 200; // calculate "quick" transition speed (for captions)
			
			// quick transition when requested by button click
			if (!include_transition) {
				c_speed = 300;
				c_quickspeed = 80;
			}
			current_slide = slide;
			
			// update navigation
			$(caption_div + ' ul a').removeClass('active');
			$(caption_div + ' ul').children('li').eq(slide).children('a').addClass('active');
			
			// transition and update caption data
			$(caption_div_inner).fadeOut(c_quickspeed,function() {
				$(this).find('a').first().attr('href',$('#'+sid+'-slide-buffer'+slide).data('link')).empty();
				if ( $('#'+sid+'-slide-buffer'+slide).data('heading') != '' ) {
					$(this).find('a').first().append('<h2><span>'+$('#'+sid+'-slide-buffer'+slide).data('heading')+'</span></h2>');
				}
				if ( $('#'+sid+'-slide-buffer'+slide).data('caption') != '' ) {
					$(this).find('a').first().append('<p><span>'+$('#'+sid+'-slide-buffer'+slide).data('caption')+'</span></p>');
				}
				$(caption_div_inner).delay(c_quickspeed*2).fadeIn(c_quickspeed);
			});
			
			// transition image
			is_transitioning = true;
			$('#'+sid+'-slide-buffer'+slide).hide().addClass('incoming-slide').fadeIn(c_speed, function() {
				$(image_div + ' .current-slide').removeClass('current-slide');
				$(this).addClass('current-slide').removeClass('incoming-slide');
				is_transitioning = false;
			});
		}
	
	
	// End jQuery(document).ready
	});
}	




