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
		var mouse = {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top
		};
		var transformedCoord = this.transformCoord(canvasId, mouse, scale, translation);
		// now add the translation to the coordinate since we are in the correct coordinate system now
		return transformedCoord;
	},
	getMouseWithContextTranslation: function() {
		var translation = arguments[1];
		var scale = arguments[2];
		var mouse = this.getMouse.apply(this, arguments);
		mouse.x += -translation.x * 1 / scale;
		mouse.y += -translation.y * 1 / scale;
		return mouse;
	},
	transformCoord: function(canvasId, coord, scale, translation) {
		var canvas = document.getElementById(canvasId);
		var ctx = canvas.getContext('2d');
		ctx.save();

		var w = -translation.x + canvas.width / 2;
		var h = -translation.y + canvas.height / 2;
		// initial coordinates
		var x1 = coord.x;
		var y1 = coord.y;
		// translate and scale
		var x2 = (x1 - w) / 1 / scale;
		var y2 = (y1 - h) / 1 / scale;
		// retranslate
		var x3 = (x2 - (-w)) / 1;
		var y3 = (y2 - (-h)) / 1;

		ctx.restore();

		return {
			x: x3,
			y: y3
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
	// drawShapeOnCanvas: function(canvas, shape) {
	// 	var ctx = canvas.getContext('2d');
	// 	shape.draw(ctx);
	// },
	clipShapeOnCanvas: function(canvas, shape) {
		var ctx = canvas.getContext('2d');

		if (shape instanceof Polygon) {
			shape.drawPolygonFromCoords(ctx, function() {
				ctx.save();
				ctx.lineWidth = 2;
				ctx.setLineDash([0]);
				ctx.stroke();
				ctx.restore();

				ctx.clip();
			});
		} else {
			ctx.rect(shape.x, shape.y, shape.w, shape.h);
			ctx.clip();
		}
	},
	calcClipRectangle: function(shape) {
		if (shape instanceof Rectangle) {
			return {
				x: shape.x,
				y: shape.y,
				w: shape.w,
				h: shape.h
			};
		} else if (shape instanceof Polygon) {
			var smX = Infinity;
			var smY = Infinity;
			var bigX = 0;
			var bigY = 0;
			_.each(shape.coords, function(coord) {
				if (coord.x < smX) {
					smX = coord.x;
				} else if (coord.x > bigX) {
					bigX = coord.x;
				}
				if (coord.y < smY) {
					smY = coord.y;
				} else if (coord.y > bigY) {
					bigY = coord.y;
				}
			});
			return {
				x: smX,
				y: smY,
				w: bigX - smX,
				h: bigY - smY
			};
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
	insertPolygon: function(coords, polyCollection, extendPolygon) {
		var counter = polyCollection.find().fetch().length;
		var extendedPolygon = extendPolygon();
		var color = this.getRandomRgbColor();
		var insertPolygon = {
			coords: coords,
			color: color,
			name: 'Poly ' + counter,
			textPos: coords[0]
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
				x: mouse.x + 50,
				y: mouse.y + 50
			}
		};
		if (extendedRectangle) {
			insertRectangle = _.extend(insertRectangle, extendedRectangle);
		}
		rectCollection.insert(insertRectangle);
	},
	/*
	 * calculates a square for a given origin point and side length
	 * @returns [{x: Number, y: Number}] Array of coordinates, where the origin
	 * of the square is the first coord in the array
	 */
	calculateSquare: function(origin, length, transform) {
		var rectangle = [];

		function addCoord (i, j) {
			var coord = {
				x: origin.x + (i * length),
				y: origin.y + (j * length)
			};
			if(typeof transform === 'function'){
				coord = transform(coord);
			}
			rectangle.push(coord);
		}

		for (var i = 0; i <= 1; i++) {
			if(i === 1){
				// count backwards to push the coords in the right order
				for (var j = 1; j >= 0; j--) {
					addCoord(i,j);
				}
			}else{
				for (var k = 0; k <= 1; k++) {
					addCoord(i,k);
				}
			}
		}

		return rectangle;
	}
};