// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update December 2014
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Polygon objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
/* jshint strict: false */

/*jshint undef:true */
/*global CanvasFunctions:true */
/*global document */

// checks if two points are close enough to each other depending on the closeEnough param
CanvasFunctions = {
	setCanvasEnvironmentVariables: function(canvas) {
		this.canvas = canvas;
		// This complicates things a little but but fixes mouse co-ordinate problems
		// when there's a border or padding. See getMouse for more detail
		if (document.defaultView && document.defaultView.getComputedStyle) {
			this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null).paddingLeft, 10) || 0;
			this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null).paddingTop, 10) || 0;
			this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null).borderLeftWidth, 10) || 0;
			this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null).borderTopWidth, 10) || 0;
		}
		// Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
		// They will mess up mouse coordinates and this fixes that
		var html = document.body.parentNode;
		this.htmlTop = html.offsetTop;
		this.htmlLeft = html.offsetLeft;
	},
	checkCloseEnough: function(p1, p2, closeEnough) {
		return Math.abs(p1 - p2) < closeEnough;
	},
	// Draws a white rectangle with a black border around it
	drawRectWithBorder: function(coords, sideLength, colors, context) {
		if (!colors) {
			colors = {};
		}
		if (!colors.borderColor) {
			colors.borderColor = 'black';
		}
		if (!colors.bgColor) {
			colors.bgColor = 'white';
		}
		context.save();
		context.fillStyle = colors.borderColor;
		context.fillRect(coords.x - (sideLength / 2), coords.y - (sideLength / 2), sideLength, sideLength);
		context.fillStyle = colors.bgColor;
		context.fillRect(coords.x - ((sideLength - 1) / 2), coords.y - ((sideLength - 1) / 2), sideLength - 1, sideLength - 1);
		context.restore();
	},
	// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
	// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
	getMouse: function(e) {
		var element = this.canvas,
			offsetX = 0,
			offsetY = 0,
			mx, my;

		// Compute the total offset
		if (element.offsetParent !== undefined) {
			do {
				offsetX += element.offsetLeft;
				offsetY += element.offsetTop;
			} while ((element = element.offsetParent));
		}

		// Add padding and border style widths to offset
		// Also add the <html> offsets in case there's a position:fixed bar
		offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
		offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

		mx = e.pageX - offsetX;
		my = e.pageY - offsetY;

		// We return a simple javascript object (a hash) with x and y defined
		return {
			x: mx,
			y: my
		};
	}
};