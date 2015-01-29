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
  this.collection = polyCollection;
  this.valid = true;
  this.name = polygon.name;
  this.canvasStateObj = canvasStateObj;
  this.selectedCoord = new ReactiveVar(null);
  this.minPoints = 3;
  this.visible = true;
  this.textField = new TextField(this.name, this.canvasStateObj, this.collection, this.id);
  // call superclass constructor
  Shape.call(this, polygon);

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
      self.remove();
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

    if (polygon.hasOwnProperty('textPos')) {
      self.textField.setPosition(polygon.textPos.x, polygon.textPos.y, self.canvasStateObj.canvas, false);
    } else {
      self.textField.setPosition(self.coords[0].x, self.coords[0].y, self.canvasStateObj.canvas);
    }
  });
};
Polygon.prototype = new Shape();

// Draws this polygon to a given context
Polygon.prototype.draw = function(ctx) {

  if (this.visible === false) {
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
  this.textField.draw(ctx);
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
  if (this.visible === false) {
    return;
  }
  if (this.touchedAtHandles(mx, my) === true) {
    return true;
  }
  if (this.textField && this.textField.contains(mx, my) === true) {
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
  if (this.visible === false) {
    return;
  }
  // check all coord points
  if (this.touchedAtHandlesReturnPoint(mx, my)) {
    return true;
  }
};

Polygon.prototype.touchedAtHandlesReturnPoint = function(mx, my) {
  if (this.visible === false) {
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

Polygon.prototype.mousedown = function(e, mouse) {
  // if this Polygon is not selected yet than we dont accept any touches
  if (this.visible === false || this.selected === false) {
    return;
  }
  // check for touch at handles
  if (this.touchedAtHandles(mouse.x, mouse.y)) {
    this.resizing = true;
    // resizing
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
  } else {
    if (this.contains(mouse.x, mouse.y)) {
      //dragging
      this.dragging = true;
      // handle text field first
      if (this.textField.selected && this.textField.contains(mouse.x, mouse.y)) {
        this.textField.mousedown(e, mouse);
      } else {
        // if text field is not touched -> move rectangle
        this.dragoffx = mouse.x - this.coords[0].x;
        this.dragoffy = mouse.y - this.coords[0].y;
        // this.startCoords = this.coords;
        // also tell the text field about the touch
        this.textField.mousedown(e, mouse);
      }
    }
  }
  // invalidate to get the change into the db
  this.valid = false;
  // rerender to see the change
  this.canvasStateObj.valid = false;
};

Polygon.prototype.mouseup = function(e, mouse) {
  var touchHandled = Shape.prototype.mouseup.call(this);
  if (!this.selected) {
    // set as selected
    this.selected = true;
    this.canvasStateObj.selection.set(this);
  } else {
    // stop resizing/dragging
    this.dragging = false;
    this.resizing = false;

    // check if text field was clicked
    touchHandled = this.textField.mouseup(e, mouse);
  }
  if (this.contains(mouse.x, mouse.y)) {
    touchHandled = true;
  }
  // invalidate to get the change into the db
  this.valid = false;
  // rerender to see the change
  this.canvasStateObj.valid = false;
  return touchHandled;
};

Polygon.prototype.dblclick = function(e, mouse) {
  this.addPoint(mouse);
  this.valid = false;
  this.canvasStateObj.valid = false;
};

Polygon.prototype.mouseMoveResize = function(e, mouse) {

  var newPoint = {
    x: mouse.x,
    y: mouse.y
  };
  this.coords[this.selectedIndex] = newPoint;
  this.selectedPoint = newPoint;
};

// function that moves all points of the polygon with the given translation
Polygon.prototype.translate = function(e, mouse) {
  var translationOfOrigin = {
    x: mouse.x - this.dragoffx,
    y: mouse.y - this.dragoffy
  };
  translation = {
    x: translationOfOrigin.x - this.coords[0].x,
    y: translationOfOrigin.y - this.coords[0].y
  };
  // move all coords
  for (var i in this.coords) {
    if (this.coords.hasOwnProperty(i)) {
      // var x = this.startCoords[i].x;
      // var y = this.startCoords[i].y;
      this.coords[i].x += translation.x;
      this.coords[i].y += translation.y;
    }
  }
};

// function that checks wether this Polygon may be stored
Polygon.prototype.mayBeCreated = function() {
  // check if the min number of points is fulfilled
  if (this.coords.length >= this.minPoints) {
    return true;
  }
  return false;
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
  // find place in array to insert the new point
  var closestCoordIndex = this.coords.length - 1;
  var secondClosestCoordIndex = this.coords.length - 2;
  var lowestDistance = Infinity;
  var secLowestDistance = Infinity;
  for (var i in this.coords) {
    coord = this.coords[i];
    var distance = Math.sqrt(Math.pow(newPoint.x - coord.x, 2) + Math.pow(newPoint.y - coord.y, 2));
    // check for the lowest distance
    if (distance < lowestDistance) {
      lowestDistance = distance;
      closestCoordIndex = i;
      continue;
    }
  }
  var ci = parseInt(closestCoordIndex);

  var compFuncX = Math.max;
  if (newPoint.x < this.coords[ci].x) {
    compFuncX = Math.min;
  }
  var compFuncY = Math.max;
  if (newPoint.y < this.coords[ci].y) {
    compFuncY = Math.min;
  }
  // compare prev coordinate with the chosen nearest cordinate
  if (compFuncX(this.coords[ci - 1].x, this.coords[ci].x) == this.coords[ci - 1].x) {
    // compare prev coordinate with the new cordinate
    if (compFuncX(this.coords[ci - 1].x, newPoint.x) == this.coords[ci - 1].x) {
      // we know that newPoint.x < this.coords[ci].x => si.x < new.x < ci.x (< can be > aswell)
      si = ci - 1;
    }
  }
  // compare next coordinate with the chosen nearest cordinate
  if (compFuncX(this.coords[ci + 1].x, this.coords[ci].x) == this.coords[ci + 1].x) {
    // compare next coordinate with the new cordinate
    if (compFuncX(this.coords[ci + 1].x, newPoint.x) == this.coords[ci + 1].x) {
      // we know that newPoint.x < this.coords[ci].x => si.x < new.x < ci.x (< can be > aswell)
      si = ci + 1;
    }
  }
  // compare y values
  if (compFuncY(this.coords[ci - 1].y, this.coords[ci].y) == this.coords[ci - 1].y) {
    // compare next coordinate with the new cordinate
    if (compFuncY(this.coords[ci - 1].y, newPoint.y) == this.coords[ci - 1].y) {
      // we know that newPoint.x < this.coords[ci].x => si.x < new.x < ci.x (< can be > aswell)
      si = ci - 1;
    }
  }
  if (compFuncY(this.coords[ci + 1].y, this.coords[ci].y) == this.coords[ci + 1].y) {
    // compare next coordinate with the new cordinate
    if (compFuncY(this.coords[ci + 1].y, newPoint.y) == this.coords[ci + 1].y) {
      // we know that newPoint.x < this.coords[ci].x => si.x < new.x < ci.x (< can be > aswell)
      si = ci + 1;
    }
  }

  // check if the second closest index is exactly the next index in the array
  if (si == ci+1) {
    ci = si;
  }
  // insert new point and redraw
  this.coords.splice(ci, 0, newPoint);
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