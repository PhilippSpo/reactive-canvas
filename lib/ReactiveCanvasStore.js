// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update February 2015
//
// Free to use and distribute at will
// As long as you are nice to people, etc

/* jshint strict: false */

/* global ReactiveCanvasStore:true */
/* global PolygonFunctions */

ReactiveCanvasStore = {
	shapeFunctions: {
		Polygon: PolygonFunctions,
		Rectangle: RectangleFunctions
	}
};