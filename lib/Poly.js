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

/* global Shape:true */
/*global Polygon:true */
/*global addPointToPolyDoc:true */
/*global ReactiveVar */
/*global Tracker */
/*global Shape */
/*global CanvasFunctions*/

Polygon = function(id, polyCollection, canvasStateObj) {
  var polygon = polyCollection.findOne({
    _id: id
  });
  if (!polygon) {
    return;
  }
  this.id = id;
  this.selected = false;
  this.closeEnough = 10;
  this.collection = polyCollection;
  this.valid = true;
  this.name = polygon.name;
  this.canvasStateObj = canvasStateObj;
  this.selectedCoord = new ReactiveVar(null);
  this.minPoints = 3;
  this.visible = true;

  var self = this;

  // set this as selected if it was just created in the current browser
  Tracker.autorun(function() {
    if (canvasStateObj.createdId.get() === id) {
      canvasStateObj.selection.set(self);
      self.deselect();
      canvasStateObj.valid = false;
    }
  });

  Tracker.autorun(function() {
    var polygon = polyCollection.findOne({
      _id: self.id
    });
    if (!polygon) {
      // remove polygon from canvas when it has been removed in the db
      var index = canvasStateObj.shapes.indexOf(self);
      if (index > -1) {
        canvasStateObj.shapes.splice(index, 1);
      }
      if (canvasStateObj.selection.get() === self) {
        canvasStateObj.selection.set(null);
      }
      // tell canvas to redraw
      canvasStateObj.valid = false;
      return;
    }
    var coords = polygon.coords;
    // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
    // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
    // But we aren't checking anything else! We could put "Lalala" for the value of x 
    self.coords = coords;
    var c = polygon.color;
    self.color = c;
    self.fill = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + self.opacity + ')' || '#AAAAAA';
    // only set canvas to invalid and not the polygon (so that the db doesnt get populated with the same change twice)
    canvasStateObj.valid = false;
  });
};
Polygon.prototype = new Shape();
// remove shape from canvas and delete reference
Polygon.prototype.remove = function(removeFromDb) {
  Shape.prototype.remove.call(this, removeFromDb);
};
Polygon.prototype.setOpacity = function(opacity) {
  Shape.prototype.setOpacity.call(this, opacity);
};

// Draws this polygon to a given context
Polygon.prototype.draw = function(ctx) {

  if(this.visible === false){
    return;
  }

  // set opacity according to selection
  if (this.selected === true) {
    this.setOpacity(0.9);
  } else {
    this.setOpacity(0.6);
  }

  if (!this.valid) {
    this.collection.update({
      _id: this.id
    }, {
      $set: {
        coords: this.coords
      }
    });
  }

  // draw the actual polygon
  this.fillPolygon(ctx);

  // dashed border
  this.drawBorder(ctx);

  // draw resize handles when selected
  if (this.selected === true) {
    this.drawHandles(ctx);
  }

  // add text
  ctx.font = '15pt Helvetica Neue';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
};

Polygon.prototype.drawBorder = function(ctx) {
  // black dashed border when selected
  if (this.selected === true) {
    ctx.lineWidth = 1;
  }
  // draw actual border
  ctx.beginPath();
  ctx.setLineDash([5]);
  this.drawPolygonFromCoords(ctx, function() {
    // when the poly is drawn on the canvas continue
    ctx.closePath();
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
};

Polygon.prototype.fillPolygon = function(ctx) {
  // fill rect with color
  ctx.fillStyle = this.fill;
  ctx.beginPath();
  this.drawPolygonFromCoords(ctx, function() {
    // when the poly is drawn on the canvas continue
    ctx.closePath();
    ctx.fill();
  });
};

Polygon.prototype.drawPolygonFromCoords = function(ctx, callback) {
  var first = true;
  for (var j in this.coords) {
    if (this.coords.hasOwnProperty(j)) {
      var point = this.coords[j];
      if (first) {
        ctx.moveTo(point.x, point.y);
        first = false;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
  }
  callback();
};

// Draw handles for resizing the Polygon
Polygon.prototype.drawHandles = function(ctx) {
  for (var i in this.coords) {
    if (this.coords.hasOwnProperty(i)) {
      var point = this.coords[i];
      var borderColor = 'rgba(0,0,0,1)';
      var bgColor = 'rgba(255,255,255,1)';
      if (this.selectedCoord.get() === i) {
        borderColor = 'rgba(0,0,255,1)';
        bgColor = 'rgba(100,100,255,1)';
      }
      CanvasFunctions.drawRectWithBorder(point, this.closeEnough, {
        borderColor: borderColor,
        bgColor: bgColor
      }, ctx);
    }
  }
};

// Determine if a point is inside the polygon's bounds
Polygon.prototype.contains = function(mx, my) {
  if(this.visible === false){
    return;
  }
  if (this.touchedAtHandles(mx, my) === true) {
    return true;
  }
  var p = {
    x: mx,
    y: my
  };
  var isOdd = false;
  var j = (this.coords.length - 1);
  for (var i = 0; i < this.coords.length; i++) {
    if (this.coords.hasOwnProperty(i) && this.coords.hasOwnProperty(j)) {
      if ((this.coords[i].y < p.y && this.coords[j].y >= p.y) ||
        (this.coords[j].y < p.y && this.coords[i].y >= p.y)) {
        if (this.coords[i].x + (p.y - this.coords[i].y) / (this.coords[j].y -
            this.coords[i].y) * (this.coords[j].x - this.coords[i].x) < p.x) {
          isOdd = (!isOdd);
        }
      }
      j = i;
    }
  }
  return isOdd;
};

// Determine if a point is inside the polygon's handles
Polygon.prototype.touchedAtHandles = function(mx, my) {
  if(this.visible === false){
    return;
  }
  // check all coord points
  if (this.touchedAtHandlesReturnPoint(mx, my)) {
    return true;
  }
};

Polygon.prototype.touchedAtHandlesReturnPoint = function(mx, my) {
  if(this.visible === false){
    return;
  }
  var cf = CanvasFunctions;
  // check all coord points
  for (var i in this.coords) {
    if (this.coords.hasOwnProperty(i)) {
      var point = this.coords[i];
      if (cf.checkCloseEnough(mx, point.x, this.closeEnough) && cf.checkCloseEnough(my, point.y, this.closeEnough)) {
        return point;
      }
    }
  }
};

Polygon.prototype.mouseDown = function(e, mouse) {
  this.selectedPoint = this.touchedAtHandlesReturnPoint(mouse.x, mouse.y);
  for (var i in this.coords) {
    if (this.coords.hasOwnProperty(i)) {
      var point = this.coords[i];
      if (point === this.selectedPoint) {
        // selected index is for moving the coord
        this.selectedIndex = i;
        // selected coord is for deleting/selecting the coord
        this.selectedCoord.set(i);
      }
    }
  }
};

Polygon.prototype.mouseMove = function(e, mouse) {

  var newPoint = {
    x: mouse.x,
    y: mouse.y
  };
  this.coords[this.selectedIndex] = newPoint;
  this.selectedPoint = newPoint;
  // set to false, so the draw method updates the database and draws the change
  this.valid = false;
  // redraw canvas -> poly gets redrawn autom.
  this.canvasStateObj.valid = false;

};

// function that moves all points of the polygon with the given translation
Polygon.prototype.move = function(e, translation) {
  // move all coords
  for (var i in this.coords) {
    if (this.coords.hasOwnProperty(i)) {
      var x = this.coords[i].x;
      var y = this.coords[i].y;
      this.coords[i].x = x + translation.x;
      this.coords[i].y = y + translation.y;
    }
  }
  // redraw
  this.valid = false;
  this.canvasStateObj.valid = false;
};

// function that checks wether this Polygon may be stored
Polygon.prototype.mayBeCreated = function() {
  // check if the min number of points is fulfilled
  if (this.coords.length >= this.minPoints) {
    return true;
  }
  return false;
};

Polygon.prototype.deselect = function() {
  this.selected = false;
  this.selectedCoord.set(null);
};

// deletes the selected coord point and stores the change to the db
Polygon.prototype.deleteSelectedCoord = function() {
  var coordIndex = this.selectedCoord.get();
  // remove coord from coords store
  this.coords.splice(coordIndex, 1);
  // invalidate to get the change into the db
  this.valid = false;
  // rerender to see the change
  this.canvasStateObj.valid = false;
  // unselect coord
  this.selectedCoord.set(null);
};

Polygon.prototype.addPoint = function(newPoint) {
  addPointToPolyDoc(newPoint, this.canvasStateObj, this.id, this.collection);
};

addPointToPolyDoc = function(newPoint, canvasStateObj, polygonId, polyCollection) {
  // just update the database, since the existing element will redraw itself with the update from the database
  polyCollection.update({
    _id: polygonId
  }, {
    $push: {
      coords: newPoint
    }
  });
};