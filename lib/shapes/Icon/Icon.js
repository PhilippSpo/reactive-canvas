// By Philipp Sporrer
// https://github.com/PhilippSpo
// philipp.sporrer@planifcia.de
//
// Last update February 2015
//
// Free to use and distribute at will
// As long as you are nice to people, etc

/* jshint strict: false */

/* global Icon:true */
/* global $ */
/* global lodash */
/* global _:true */

/*
 * Class representing an icon that can be drawn to a canvas
 *
 * @class
 * @property {string}  id						- The id of the icon in mongodb
 * @property {Array.<object>} cfg				- The config for this icon
 * @property {object} cfg.collection			- The Mongo.Collection instance of the collection holding this icon
 * @property {object} canvasStateObj			- The reference to the reactive canvas object
 */

var _ = lodash;

Icon = function(id, cfg, canvasStateObj) {

	var self = this;
	self.cfg = cfg;
	self.doc = self.cfg.collection.findOne({_id: id});
	self.canvasStateObj = canvasStateObj;

};
Icon.prototype = new Shape();

Icon.prototype.draw = function(ctx){

	var self = this;

	ctx.save();
	// ctx.font = "40px FontAwesome";
	// ctx.fillText(String.fromCharCode("0xf000"), 200, 200);
	ctx.restore();

};

Icon.prototype._mouseDown = function(){};
Icon.prototype._mouseMove = function(){};
Icon.prototype._mouseUp = function(){};