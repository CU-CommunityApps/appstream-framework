/* Tooltips 0.5b (ama39)
	-- added experimental support for padding-adjustments (3/30/12)
	-- fixed IE double tooltip bug (4/3/12)
	-- support for mouse tracking in relative-positioned elements (11/14/12) 
	-- final fix for relative-positioning, improved handling of edge-detection, touch device improvements (8/8/14)
   ------------------------------------------- */   

/* Global Options -------------- */
var tooltip_maxwidth = 300;
var tooltip_shadow = true;
var fadein_speed = 200;
var fadein_delay = 400;
var fadeout_speed = 100;
var fadeout_delay = 20;

/* Global Variables ------------ */
var tip_active = false;
var fade_active = false;
var tip_count = 0;
var current_tip = 0;
var xMouse = 0;
var yMouse = 0;
var bounds_x1 = 0;
var bounds_x2 = 0;
var bounds_y1 = 0;
var bounds_y2 = 0;
var touch = false;

jQuery(document).ready(function($) {
	/* Touch Device Support -------- */
	// requires Modernizr "touch" class
	if ( $("html").hasClass("touch") ) {
		touch = true;
	}
	
	tooltips();
});

/* -----------------------------------------------------------------------------------------
   Initialize Tooltips
   -----------------------------------------------------------------------------------------
   - begin mouse tracker
   - creates the tooltip DIV node
   - sets up mouse events to control tooltip behavior
-------------------------------------------------------------------------------------------- */
function tooltips(custom_delay) {
	// Capture optional custom delay value ---------- 
	if (touch) {
		fadein_delay = 0;
		fadeout_delay = 2000;
	}
	if (custom_delay) {
		fadein_delay = custom_delay;
	}
	
	// Track mouse coordinates ---------- 
	$(document).mousemove(function(e) {
		xMouse = e.pageX;
		yMouse = e.pageY;
		
		if (tip_active && !fade_active) {
			if (xMouse < bounds_x1 || xMouse > bounds_x2 || yMouse < bounds_y1 || yMouse > bounds_y2) {
				//$("#log").prepend("<div>out</div>");
				toolTipsDelayOut();
				fade_active = true;
			}
		}
	});
	
	// Click off tooltips ----------
	$(document).mousedown(function() {
		$("#tooltip").css("display","none");
		tip_active = false;
		current_tip = 0;
	});
	
	// Create #tooltip node ---------- 
	$("body").append("<div id=\"tooltip\"></div>");
	$("#tooltip").css({
		"position": "absolute",
		"display": "none"
	});
	if (tooltip_shadow) {
		$("#tooltip").addClass("dropshadow"); // apply dropshadow preference		
	}
	
	// Setup hover events ----------
	$(".tooltip").each(function() {
		tip_count++;
		$(this).data("tipID",tip_count);
		$(this).data("tiptext",$(this).attr("title"));
		$(this).removeAttr("title");
		
		$(this).on('mouseenter',function() {
			var tiptext = $(this).data("tiptext");
			//$("#log").prepend("<div>tipid: "+$(this).data("tipID")+", current: "+current_tip+"</div>");
			if (tiptext != "" && tiptext != undefined && $(this).data("tipID") != current_tip) {	
				
				$("#tooltip").css("left","0");
				$("#tooltip").html(tiptext);
				$("#tooltip").css({
					"width": "auto",
					"display": "none"
				});
				
				// send bounds data ----------
				var position = $(this).offset();
				toolTipsGetElementBounds(
					position.left , 
					position.top , 
					$(this).outerHeight() , 
					$(this).outerWidth() , 
					$(this)
				);
				
				// activate tooltip ----------
				current_tip = $(this).data("tipID");
				toolTipsDelayIn(this);
			}
		});
		$(this).on('mouseleave',function() {
			if (!tip_active) {
				clearTimeout(window.tip_delay);
				current_tip = 0;
			}
		});
	});
}

/* -----------------------------------------------------------------------------------------
   Tooltip UI Delay
   -----------------------------------------------------------------------------------------
   - delay the tooltip response on mouseover slightly
   - calculate size and position after the delay
-------------------------------------------------------------------------------------------- */
function toolTipsDelayIn(nodeID) {
	clearTimeout(window.tip_delay);
	tip_active = false;
	fade_active = false;
	window.tip_delay = setTimeout(function() {
		if ($("#tooltip").width() > tooltip_maxwidth) {
			$("#tooltip").css("width",(tooltip_maxwidth.toString()+"px"));
			$("#tooltip").css("white-space","normal");
		}
		else {
			$("#tooltip").css("white-space","nowrap");
		}
		var position = $(nodeID).offset();
		$("#tooltip").css({
			"top": yMouse - ($("#tooltip").height()+13) ,
			"left": xMouse + 3
		}).fadeIn(fadein_speed,function() {
			if (touch) {
				toolTipsDelayOut();
				fade_active = true;
			}
		});
		tip_active = true;
		
		// edge detection ----------
		var xTest = (xMouse + 4) + $("#tooltip").width();
		var yTest = yMouse - ($("#tooltip").height()+13);
		var xPadding = parseInt($("#tooltip").css("padding-left")) + parseInt($("#tooltip").css("padding-right"));
		var yPadding = parseInt($("#tooltip").css("padding-top")) + parseInt($("#tooltip").css("padding-bottom"));
		if (xTest + xPadding+2 > $(window).width() + $(window).scrollLeft()) {
			//$("#log").append("<div>out of bounds: right</div>");
			$("#tooltip").css("left", parseInt($("#tooltip").css("left")) - ($("#tooltip").width() + xPadding + 6));
		}
		if (yTest + yPadding+2 < $(window).scrollTop()) {
			//$("#log").append("<div>out of bounds: top</div>");
			$("#tooltip").css("top", parseInt($("#tooltip").css("top")) + ($("#tooltip").height() + yPadding + 26));
		}
		
	}, fadein_delay);
}
function toolTipsDelayOut() {
	clearTimeout(window.tip_delay);
	window.tip_delay = setTimeout(function() {
		if (tip_active) {
			$("#tooltip").fadeOut(fadeout_speed);
			tip_active = false;
			fade_active = false;
			current_tip = 0;
		}
	}, fadeout_delay);
}

/* -----------------------------------------------------------------------------------------
   Detect Element Bounds
   -----------------------------------------------------------------------------------------
   - makes some simple calculations to determine the hit area for an element
   - arguments: left, top, height, width, element reference
-------------------------------------------------------------------------------------------- */
function toolTipsGetElementBounds(x,y,h,w,child) {
	//$("#log").prepend("<div>"+ y + " " + $(tip_parent).offset().top + "</div>");
	bounds_x1 = x + parseInt($(child).css("margin-left"));
	bounds_x2 = bounds_x1 + w;
	bounds_y1 = y + parseInt($(child).css("margin-top"));
	bounds_y2 = bounds_y1 + h;
}

