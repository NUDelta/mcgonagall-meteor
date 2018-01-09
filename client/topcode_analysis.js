// ideally these would be auto-detected, but for now we'll hardcode
const VIDEO_WIDTH = 640; //1920;
const VIDEO_HEIGHT = 480; //1080;

const IOS_WIDTH = 375;
// with UINavBar and UIStatusBar
const IOS_FULL_HEIGHT = 667;
// without
const IOS_VIEW_HEIGHT = 603;
const IOS_TOP_PADDING = 64;

// The amount of frames without the topcode needed for the digital element to hide  
const FRAME_BUFFER = 5;

// topcodes corresponding to different elements
// arrays correspond to [top left, top right, bottom left, bottom right]
const codes = {
  keyboard : 31,
  camera : 361,
  photo : [93, 155, 203, 271],
  map : [157, 205, 279, 327],
  cameraOverlay : 331,
  photoOverlay : 421,
  mapOverlay : 331,
}

// msgs sent to iOS for elements that should be on-screen
var states = {
  keyboard : false,
  camera : false,
  photo : false,
  map : false, 
  keyboardOverlay : false,
  cameraOverlay : false,
  photoOverlay : false,
  mapOverlay: false, 
}

// buffer for each element 
// once a topcode was visible or not visible for 3 subsequent frames we can call the server method
var buffer = {
  keyboard : 0,
  camera : 0,
  photo : 0,
  map : 0, 
  keyboardOverlay : 0,
  cameraOverlay : 0,
  photoOverlay : 0,
  mapOverlay: 0, 
}

Template.cc.rendered = function videoSetup() {
  document.querySelector("#camera-button").onclick = function(){ TopCodes.startStopVideoScan('video-canvas'); };
  // TODO: change button color based on state
};

TopCodes.setVideoFrameCallback("video-canvas", function(jsonString) {

  // TODO: add in scanning to initial page load
  // TODO: fix for unsteady detection

  var json = JSON.parse(jsonString);
  var topcodes = json.topcodes;
  var ctx = document.querySelector("#video-canvas").getContext('2d');

  // all topcodes currently on screen and their properties
  var codeDict = {}

  // reshape topcode representation
  for (index in topcodes) {

    topcode = topcodes[index];

    // just get the center of the code for now
    codeDict[topcode.code] = {
      x : topcode.x,
      y : topcode.y, 
      radius : topcode.radius
    }
  }

  parseCodes(codeDict); 

});

function parseCodes(codeDict) {

  // TODO: add a listener for changes in topcodes rather than constantly sending server calls

  // find codes we care about
  if (codes['keyboard'] in codeDict) {

    // if we see the topcode in the camera stream at all wipe the buffer
    buffer['keyboard'] = 0;
    if (!states['keyboard']) {
      Meteor.call('showKeyboard', session);
      states['keyboard'] = true;
    }

  } else if (!(codes['keyboard'] in codeDict) && 
      states['keyboard']) {

    if (buffer['keyboard'] == FRAME_BUFFER) {
      Meteor.call('hideKeyboard', session);
      states['keyboard'] = false;
      buffer['keyboard'] = 0;
    } else {
      buffer['keyboard']++;
    }

  }

  if (codes['camera'] in codeDict) {

    // if we see the topcode in the camera stream at all wipe the buffer
    buffer['camera'] = 0;
    if (!states['camera']) {
      Meteor.call('showCamera', session);
      states['camera'] = true;
    }

    if (codes['cameraOverlay'] in codeDict) {
      buffer['cameraOverlay'] = 0;
      var screenshotWidth = (VIDEO_HEIGHT / IOS_FULL_HEIGHT) * IOS_WIDTH;
      var screenshotX = (VIDEO_WIDTH - screenshotWidth) / 2;

      // Camera always takes up the whole screen on iOS, so send everything in the interface region
      // Picker doesn't include UINavBar or UIStatusBar
      screenshot(screenshotX, 0, screenshotWidth, VIDEO_HEIGHT, 0, 0, IOS_WIDTH, IOS_FULL_HEIGHT, "cameraOverlay", "true");
    }

  } else if (!(codes['camera'] in codeDict) && 
      states['camera']) {

    if (buffer['camera'] == FRAME_BUFFER) {
      Meteor.call('hideCamera', session);
      states['camera'] = false;
      buffer['camera'] = 0;
    } else {
      buffer['camera']++;
    }

  }

  if ((codes['photo'][0] in codeDict &&
      codes['photo'][1] in codeDict &&
      codes['photo'][2] in codeDict &&
      codes['photo'][3] in codeDict)) {

    buffer['photo'] = 0;
    // TODO: add in algorithm to include bottom right code & make shape more stable
    // publisher is mirrored
    var x = codeDict[codes['photo'][0]].x + codeDict[codes['photo'][0]].radius;
    var y = codeDict[codes['photo'][0]].y - codeDict[codes['photo'][0]].radius;
    var width = x - (codeDict[codes['photo'][1]].x - codeDict[codes['photo'][1]].radius);
    var height = (codeDict[codes['photo'][2]].y + codeDict[codes['photo'][2]].radius) - y;

    var iOSCoordinates = transformCoordinates([x, y, width, height]);

    if (iOSCoordinates) {
      Meteor.call('photo', session, iOSCoordinates[0], iOSCoordinates[1], iOSCoordinates[2], iOSCoordinates[3]);
      states['photo'] = true;
    }

    if (codes['photoOverlay'] in codeDict) {
      buffer['photoOverlay'] = 0;
      // Topcodes are detected in the mirrored publisher stream
      var screenshotX = codeDict[codes['photo'][0]].x - codeDict[codes['photo'][0]].radius;
      var screenshotY = codeDict[codes['photo'][0]].y + codeDict[codes['photo'][0]].radius;
      var screenshotWidth =  screenshotX - (codeDict[codes['photo'][1]].x + codeDict[codes['photo'][1]].radius);
      var screenshotHeight = (codeDict[codes['photo'][2]].y - codeDict[codes['photo'][2]].radius) - screenshotY;

      var screenshotIOSCoordinates = transformCoordinates([screenshotX, screenshotY, screenshotWidth, screenshotHeight]);

      // Reflect x since the image data is not mirrored (& publisher stream is)
      var reflectionAxis = VIDEO_WIDTH / 2;
      screenshotX = reflectionAxis - (screenshotX - reflectionAxis)

      if (screenshotIOSCoordinates) {
        screenshot(screenshotX, screenshotY, screenshotWidth, screenshotHeight, screenshotIOSCoordinates[0], screenshotIOSCoordinates[1], screenshotIOSCoordinates[2], screenshotIOSCoordinates[3], "photoOverlay", "false");
      }

    }


  } else if (!(codes['photo'][0] in codeDict ||
      codes['photo'][1] in codeDict ||
      codes['photo'][2] in codeDict ||
      codes['photo'][3] in codeDict) &&
      states['photo']) {

    if (buffer['photo'] == FRAME_BUFFER) {
      Meteor.call('photo', session, -999, -999, -999, -999);
      states['photo'] = false;
      buffer['photo'] = 0;
    } else {
      buffer['photo']++;
    }

  }

  if ((codes['map'][0] in codeDict &&
      codes['map'][1] in codeDict &&
      codes['map'][2] in codeDict &&
      codes['map'][3] in codeDict)) {

    buffer['map'] = 0;
    // TODO: add in algorithm to include bottom right code & make shape more stable
    // publisher is mirrored
    var x = codeDict[codes['map'][0]].x + codeDict[codes['map'][0]].radius;
    var y = codeDict[codes['map'][0]].y - codeDict[codes['map'][0]].radius;
    var width = x - (codeDict[codes['map'][1]].x - codeDict[codes['map'][1]].radius);
    var height = (codeDict[codes['map'][2]].y + codeDict[codes['map'][2]].radius) - y;

    var iOSCoordinates = transformCoordinates([x, y, width, height]);  

    if (iOSCoordinates) {
      Meteor.call('map', session, iOSCoordinates[0], iOSCoordinates[1], iOSCoordinates[2], iOSCoordinates[3]);
      states['map'] = true;
    }

    if (codes['mapOverlay'] in codeDict) {
      buffer['mapOverlay'] = 0;
      // Topcodes are detected in the mirrored publisher stream
      var screenshotX = codeDict[codes['map'][0]].x - codeDict[codes['map'][0]].radius;
      var screenshotY = codeDict[codes['map'][0]].y + codeDict[codes['map'][0]].radius;
      var screenshotWidth =  screenshotX - (codeDict[codes['map'][1]].x + codeDict[codes['map'][1]].radius);
      var screenshotHeight = (codeDict[codes['map'][2]].y - codeDict[codes['map'][2]].radius) - screenshotY;

      var screenshotIOSCoordinates = transformCoordinates([screenshotX, screenshotY, screenshotWidth, screenshotHeight]);

      // Reflect x since the image data is not mirrored (& publisher stream is)
      var reflectionAxis = VIDEO_WIDTH / 2;
      screenshotX = reflectionAxis - (screenshotX - reflectionAxis)

      if (screenshotIOSCoordinates) {
        screenshot(screenshotX, screenshotY, screenshotWidth, screenshotHeight, screenshotIOSCoordinates[0], screenshotIOSCoordinates[1], screenshotIOSCoordinates[2], screenshotIOSCoordinates[3], "mapOverlay", "false");
      }

    }

  } else if (!(codes['map'][0] in codeDict ||
      codes['map'][1] in codeDict ||
      codes['map'][2] in codeDict ||
      codes['map'][3] in codeDict) &&
      states['map']) {

    if (buffer['map'] == FRAME_BUFFER) {
      Meteor.call('map', session, -999, -999, -999, -999);
      states['map'] = false;
      buffer['map'] = 0;
    } else {
      buffer['map']++;
    }

  }

  // remove overlays w/o appr code regardless if native elements are on screen
  if (!(codes['mapOverlay'] in codeDict) && 
      states['mapOverlay']) {

    if (buffer['mapOverlay'] == FRAME_BUFFER) {
      Meteor.call('sendOverlay', session, -999, -999, -999, -999, "", "false");
      states['mapOverlay'] = false;
      buffer['mapOverlay'] = 0;
    } else {
      buffer['mapOverlay']++;
    }

  }

  if (!(codes['photoOverlay'] in codeDict) && 
      states['photoOverlay']) {

    if (buffer['photoOverlay'] == FRAME_BUFFER) {
      Meteor.call('sendOverlay', session, -999, -999, -999, -999, "", "false");
      states['photoOverlay'] = false;
      buffer['photoOverlay'] = 0;
    } else {
      buffer['photoOverlay']++;
    }

  }

  if (!(codes['cameraOverlay'] in codeDict) && 
      states['cameraOverlay']) {

    if (buffer['cameraOverlay'] == FRAME_BUFFER) {
      Meteor.call('sendOverlay', session, -999, -999, -999, -999, "", "true");
      states['cameraOverlay'] = false;
      buffer['cameraOverlay'] = 0;
    } else {
      buffer['cameraOverlay']++;
    }

  }
}

// send top left x and y in web stream, height, and width
function transformCoordinates(coordinates) {
  // publisher stream dimensions: [0, 0, 640, 480]
  // iOS subscriber stream dimensions: [0, 64, 375, 603]

  // the stream size adjusts to the height of the iOS client
  var scale = IOS_VIEW_HEIGHT / VIDEO_HEIGHT

  // coordinates from video-canvas
  var scaledX = coordinates[0] * scale;
  var scaledY = coordinates[1] * scale;
  var scaledWidth = coordinates[2] * scale;
  var scaledHeight = coordinates[3] * scale;

  // first, scale web stream, reflection line, and x = 0 for iOS
  var webStreamWidth = VIDEO_WIDTH * scale
  var reflectionAxis = webStreamWidth / 2
  var webXForiOS0 = (webStreamWidth - IOS_WIDTH) / 2

  // second, reflect for iOS transform
  var reflectedX = reflectionAxis - (scaledX - reflectionAxis)

  // finally, translate x and y
  var iOSX = reflectedX - webXForiOS0;
  var iOSY = scaledY + IOS_TOP_PADDING;

  // only return coords if element is in bounds
  if (iOSX > 0 && (iOSX + scaledWidth) < IOS_WIDTH && iOSY > IOS_TOP_PADDING && (iOSY + scaledHeight) < IOS_FULL_HEIGHT) {
    return [iOSX, iOSY, scaledWidth, scaledHeight];
  }

}

// change to arrays
function screenshot(x, y, width, height, x_ios, y_ios, width_ios, height_ios, overlayType, isCameraOverlay) {
  const data = publisher.getImgData();
  const canvas = document.createElement('canvas');
  // canvas.style.background = 'orange';
  const img = document.createElement("img");
  img.src = 'data:image/png;base64,' + data;
  const paper = document.getElementById('paper');
  paper.appendChild(img);
  img.onload = function() {
    whiteToTransparent(canvas, img, x, y, width, height, function(canvas) {
      sendToiPhone(canvas, x_ios, y_ios, width_ios, height_ios, overlayType, isCameraOverlay)
    });
  };
};

function whiteToTransparent(canvas, img, x, y, width, height, callback) {
  canvas.width = img.offsetWidth;
  canvas.height = img.offsetHeight;

  const ctx = canvas.getContext('2d');
  // TODO: change to an image bitmap
  ctx.drawImage(img, 0, 0);

  var imageData = ctx.getImageData(x, y, width, height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    //if it's white, turn it transparent
    const threshold = 100;
    // what are these things
    if (imageData.data[i] > threshold && imageData.data[i+1] > threshold && imageData.data[i+2] > threshold) {
        imageData.data[i+3] = 0;
      }
  }

  // clear canvas for redrawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas.height = height;
  canvas.width = width;

  //ctx should automatically update since its passed by referenced
  ctx.putImageData(imageData, 0, 0);
  callback(canvas);
}

function sendToiPhone(canvas, x_ios, y_ios, width_ios, height_ios, overlayType, isCameraOverlay) {
  const encodedImage = canvas.toDataURL().replace('data:image/png;base64,', '');
  const img = document.createElement('img');
  img.src = `data:image/png;base64,${ encodedImage}`;
  const paper = document.getElementById('paper');
  paper.appendChild(img);
  Meteor.call('sendOverlay', session, x_ios, y_ios, width_ios, height_ios, encodedImage, isCameraOverlay);
  states[overlayType] = true;
}