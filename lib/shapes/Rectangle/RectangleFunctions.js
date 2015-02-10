// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update February 2015
//
// Free to use and distribute at will
// As long as you are nice to people, etc

/* jshint strict: false */

/* global RectangleFunctions:true */
/* global StaticRectangleFunctions:true */
/* global CanvasFunctions */
/* global lodash */

 var _ = lodash;

RectangleFunctions = {
	createStandardShape: function(cfg, origin, transformCoord, scaleFactor, extendShape) {
		var length = 200 * scaleFactor;
		// calculate rectangular coords
		var transformedOrigin = transformCoord(origin);
		var textFieldCoord = transformCoord({x: origin.x + length/2, y: origin.y + length/2});
		// counter for text field
		var counter = cfg.collection.find().fetch().length;
		// generate random color
		var color = CanvasFunctions.getRandomRgbColor();

		var insertRectangle = {
			coords: {
				x: transformedOrigin.x,
				y: transformedOrigin.y,
				w: length,
				h: length,
			},
			color: color,
			name: 'Rectangle ' + counter,
			textPos: textFieldCoord
		};
		var extendedRectangle = extendShape();
		if (extendedRectangle) {
			insertRectangle = _.extend(insertRectangle, extendedRectangle);
		}
		var id = cfg.collection.insert(insertRectangle);
		return id;
	},

};

StaticRectangleFunctions = {
	createStandardShape: function(cfg, origin, transformCoord, scaleFactor, extendShape) {
		var length = 20 * scaleFactor;
		// calculate rectangular coords
		var transformedOrigin = transformCoord(origin);
		var textFieldCoord = transformCoord({x: origin.x + length/2, y: origin.y + length/2});
		// counter for text field
		var counter = cfg.collection.find().fetch().length;
		// generate random color
		var color = CanvasFunctions.getRandomRgbColor();

		var insertRectangle = {
			coords: {
				x: transformedOrigin.x,
				y: transformedOrigin.y,
				w: length,
				h: length,
			},
			color: color,
			name: 'Rectangle ' + counter
		};
		var extendedRectangle = extendShape();
		if (extendedRectangle) {
			insertRectangle = _.extend(insertRectangle, extendedRectangle);
		}
		var id = cfg.collection.insert(insertRectangle);
		return id;
	},

};