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
/* global CanvasFunctions */

Shape = function() {
  this.closeEnough = 10;
  this.selected = false;
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

// Draw handles for resizing the Rectangle
Shape.prototype.drawHandles = function(ctx) {
  var c = CanvasFunctions;
  var coord = {
    x: this.x,
    y: this.y
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
  coord = {
    x: this.x + this.w,
    y: this.y
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
  coord = {
    x: this.x + this.w,
    y: this.y + this.h
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
  coord = {
    x: this.x,
    y: this.y + this.h
  };
  c.drawRectWithBorder(coord, this.closeEnough, undefined, ctx);
};

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  if(this.visible === false){
    return;
  }
  if (this.touchedAtHandles(mx, my) === true) {
    return true;
  }
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  var xBool = coordInRange(mx, this.x, this.w);
  var yBool = coordInRange(my, this.y, this.h);

  function coordInRange(mouseCoord, rectCoord, rectSideLength) {
    if (rectSideLength >= 0) {
      return (rectCoord <= mouseCoord) && (rectCoord + rectSideLength >= mouseCoord);
    } else {
      return (rectCoord >= mouseCoord) && (rectCoord + rectSideLength <= mouseCoord);
    }
  }
  return (xBool && yBool);
};

// Determine if a point is inside the shape's handles
Shape.prototype.touchedAtHandles = function(mx, my) {
  if(this.visible === false){
    return;
  }
  var c = CanvasFunctions;
  // 1. top left handle
  if (c.checkCloseEnough(mx, this.x, this.closeEnough) && c.checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 2. top right handle
  else if (c.checkCloseEnough(mx, this.x + this.w, this.closeEnough) && c.checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 3. bottom left handle
  else if (c.checkCloseEnough(mx, this.x, this.closeEnough) && c.checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
  // 4. bottom right handle
  else if (c.checkCloseEnough(mx, this.x + this.w, this.closeEnough) && c.checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
};

Shape.prototype.deselect = function() {
  this.selected = false;
  if(this.selectedCoord){
    this.selectedCoord.set(null);
  }
  if(this.textField){
    this.textField.deselect();
  }
};

Shape.prototype.mousemove = function(e, mouse) {
  if (this.dragging) {
    // handle text field first
    if (this.textField.selected && this.textField.isTouched === true) {
      this.textField.mousemove(e, mouse);
    } else {
      // than handle the rectangle
      this.translate(e, mouse);
      // also tell the text field about the movement
      this.textField.mousemove(e, mouse);
    }
  } else if (this.resizing) {
    this.mouseMoveResize(e, mouse);
  }

  this.canvasStateObj.valid = false; // Something's dragging so we must redraw
  this.valid = false; // store information to database when rect gets drawn
};