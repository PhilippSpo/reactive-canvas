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
/* global CanvasFunctions */
/* global lodash */

 var _ = lodash;

RectangleFunctions = {
	createStandardShape: function(cfg, origin, transformCoord, scaleFactor, extendShape) {
		var length = 200 * scaleFactor;
		// calculate rectangular coords
		var transformedOrigin = transformCoord(origin);
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
			textPos: {
				x: transformedOrigin.x + 50,
				y: transformedOrigin.y + 50
			}
		};
		var extendedRectangle = extendShape();
		if (extendedRectangle) {
			insertRectangle = _.extend(insertRectangle, extendedRectangle);
		}
		var id = cfg.collection.insert(insertRectangle);
		return id;
	},

};