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
/*global Polygon */
/*global Rectangle */
/*global _ */

// checks if two points are close enough to each other depending on the closeEnough param
CanvasFunctions = {
	setCanvasEnvironmentVariables: function(canvasId) {
		var canvas = document.getElementById(canvasId);
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
	getMouse: function(evt, translation, scale, canvasId) {
		var canvas = document.getElementById(canvasId);
		// this is a more reliable solution for getting the mouse position
		var rect = canvas.getBoundingClientRect();
		return {
			x: (evt.clientX / scale) - (rect.left / scale) - (translation.x / scale),
			y: (evt.clientY / scale) - (rect.top / scale) - (translation.y / scale)
		};
	},
	getRandomRgbColor: function() {
		var r = Math.floor(Math.random() * 255);
		var g = Math.floor(Math.random() * 255);
		var b = Math.floor(Math.random() * 255);
		return {
			r: r,
			g: g,
			b: b
		};
	},
	drawShapeOnCanvas: function(canvas, shape) {
		var ctx = canvas.getContext('2d');
		shape.draw(ctx);
	},
	clipShapeOnCanvas: function(canvas, shape) {
		var ctx = canvas.getContext('2d');

		if (shape instanceof Polygon) {
			shape.drawPolygonFromCoords(ctx, function() {
				ctx.save();
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.restore();
				ctx.clip();
			});
		} else {
			ctx.rect(shape.x, shape.y, shape.w, shape.h);
			ctx.clip();
		}
	},
	translateContextToFitShape: function(canvas, shape) {
		var ctx = canvas.getContext('2d');
		var dimensions;
		if (shape instanceof Polygon) {
			dimensions = this.getPolygonDimensions(shape);
		} else if (shape instanceof Rectangle) {
			dimensions = this.getRectangleDimensions(shape);
		}
		// translate the canvas to fit the shape
		canvas.width = dimensions.width;
		canvas.height = dimensions.height;
		ctx.translate(-dimensions.origin.x, -dimensions.origin.y);
		return dimensions;
	},
	getPolygonDimensions: function(shape) {
		var minCoord = {
			x: null,
			y: null
		};
		var maxCoord = {
			x: null,
			y: null
		};
		_.each(shape.coords, function(point) {
			// search for the smalles and highest x value
			if (point.x < minCoord.x || minCoord.x === null) {
				minCoord.x = point.x;
			}
			if (point.x > maxCoord.x || maxCoord.x === null) {
				maxCoord.x = point.x;
			}
			// search for the smalles and highest y value
			if (point.y < minCoord.y || minCoord.y === null) {
				minCoord.y = point.y;
			}
			if (point.y > maxCoord.y || maxCoord.y === null) {
				maxCoord.y = point.y;
			}
		});
		return {
			origin: minCoord,
			width: maxCoord.x - minCoord.x,
			height: maxCoord.y - minCoord.y
		};
	},
	getRectangleDimensions: function(shape) {
		return {
			origin: {
				x: shape.x,
				y: shape.y
			},
			width: shape.w,
			height: shape.h
		};
	},
	insertPolygon: function(mouse, polyCollection, extendPolygon) {
		var counter = polyCollection.find().fetch().length;
		var extendedPolygon = extendPolygon();
		var color = this.getRandomRgbColor();
		var insertPolygon = {
			coords: [mouse],
			color: color,
			name: 'Poly ' + counter,
			textPos: mouse
		};
		if (extendedPolygon) {
			insertPolygon = _.extend(insertPolygon, extendedPolygon);
		}
		var id = polyCollection.insert(insertPolygon);
		return id;
	},
	insertRectangle: function(mouse, rectCollection, extendRectangle) {
		var counter = rectCollection.find().fetch().length;
		var extendedRectangle = extendRectangle();
		var color = CanvasFunctions.getRandomRgbColor();
		var insertRectangle = {
			coords: {
				x: mouse.x - 10,
				y: mouse.y - 10,
				w: 100,
				h: 100,
			},
			color: color,
			name: 'Rectangle ' + counter,
			textPos: {
				x: mouse.x+50,
				y: mouse.y+50
			}
		};
		if (extendedRectangle) {
			insertRectangle = _.extend(insertRectangle, extendedRectangle);
		}
		rectCollection.insert(insertRectangle);
	}
};