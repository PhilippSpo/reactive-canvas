// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update February 2015
//
// Free to use and distribute at will
// As long as you are nice to people, etc

/* jshint strict: false */

/* global PolygonFunctions:true */
/* global CanvasFunctions */
/* global lodash */

 var _ = lodash;

PolygonFunctions = {
	createStandardShape: function(cfg, origin, transformCoord, scaleFactor, extendShape) {
		var length = 200 * scaleFactor;
		// calculate rectangular coords
		var rectangluarCoords = CanvasFunctions.calculateSquare(origin, length, transformCoord);
		// counter for text field
		var counter = cfg.collection.find().fetch().length;
		// generate random color
		var color = CanvasFunctions.getRandomRgbColor();
		// prepare doc
		var insertPolygon = {
			coords: rectangluarCoords,
			color: color,
			name: 'Poly ' + counter,
			textPos: rectangluarCoords[0]
		};
		// extend shape
		if(typeof extendShape === 'function'){
			var extendedPolygon = extendShape();
			if (extendedPolygon) {
				insertPolygon = _.extend(insertPolygon, extendedPolygon);
			}
		}
		// insert to db
		var id = cfg.collection.insert(insertPolygon);
		return id;
	}
};