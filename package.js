/* Information about this package */
Package.describe({
  // Short two-sentence summary.
  summary: "Draw polygons and rectangles on a HTML5 canvas reactively",
  // Version number.
  version: "0.0.27",
  // Optional.  Default is package directory name.
  name: "philippspo:reactive-canvas",
  // Optional github URL to your source repository.
  git: "https://github.com/PhilippSpo/reactive-canvas",
});

/* This defines your actual package */
Package.onUse(function (api) {
  // If no version is specified for an 'api.use' dependency, use the
  // one defined in Meteor 0.9.0.
  api.versionsFrom('0.9.0');
  // Use Underscore package, but only on the server.
  // Version not specified, so it will be as of Meteor 0.9.0.
  api.use('underscore', 'server');
  
  api.use(['session', 'reactive-var@1.0.3', 'stevezhu:lodash@1.0.2']);
  // Specify the source code for the package.
  api.addFiles('lib/CanvasFunctions.js', 'client');
  api.addFiles('lib/Shapes/Shape.js', 'client');
  api.addFiles('lib/Shapes/Polygon/Poly.js', 'client');
  api.addFiles('lib/Shapes/Polygon/PolyFunctions.js', 'client');
  api.addFiles('lib/Shapes/Rectangle/Rect.js', 'client');
  api.addFiles('lib/Shapes/Rectangle/RectangleFunctions.js', 'client');
  api.addFiles('lib/Shapes/TextField/TextField.js', 'client');
  api.addFiles('lib/Shapes/Icon/Icon.js', 'client');
  api.addFiles('lib/ReactiveCanvas.js', 'client');
  api.addFiles('lib/panZoomCanvas.js', 'client');
  api.addFiles('lib/CanvasController.js', 'client');
  api.addFiles('lib/ReactiveCanvasStore.js', 'client');

  api.export('ReactiveCanvas');
  api.export('ReactiveCanvasStore');
});