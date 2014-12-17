/* Information about this package */
Package.describe({
  // Short two-sentence summary.
  summary: "Draw polygons and rectangles on a HTML5 canvas reactivly",
  // Version number.
  version: "0.0.1",
  // Optional.  Default is package directory name.
  name: "philippspo:reactive-canvas",
  // Optional github URL to your source repository.
  git: "https://github.com/PhilippSpo/reactive-canvas.git",
});

/* This defines your actual package */
Package.onUse(function (api) {
  // If no version is specified for an 'api.use' dependency, use the
  // one defined in Meteor 0.9.0.
  api.versionsFrom('0.9.0');
  // Use Underscore package, but only on the server.
  // Version not specified, so it will be as of Meteor 0.9.0.
  api.use('underscore', 'server');
  // Use application-configuration package, version 1.0.0 or newer.
  api.use('application-configuration@1.0.0');
  // Specify the source code for the package.
  api.addFiles('lib/Poly.js', 'client');
  api.addFiles('lib/Rect.js', 'client');
  api.addFiles('lib/CanvasState.js', 'client');

  api.export('CanvasState');
  api.export('Poly');
  api.export('Rect');
});