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

/* jshint undef: true, unused: true */
/* global Shape:true */

Shape = function() {
};

// remove shape from canvas and delete reference
Shape.prototype.remove = function(removeFromDb) {
  if (removeFromDb) {
    this.collection.remove({
      _id: this.id
    });
  }
  // remove shape from canvas when it has been removed in the db
  var index = this.canvasStateObj.shapes.indexOf(this);
  if (index > -1) {
    this.canvasStateObj.shapes.splice(index, 1);
  }
  if (this.canvasStateObj.selection.get() === this) {
    this.canvasStateObj.selection.set(null);
    this.canvasStateObj.creatingElement.set(false);
  }
  // tell canvas to redraw
  this.canvasStateObj.valid = false;
};

Shape.prototype.setOpacity = function(opacity) {
  var c = this.color;
  if (!this.color) {
    return;
  }
  this.fill = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + opacity + ')';
  this.opacity = opacity;
};