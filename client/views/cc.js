session = createSession();
let panning = false,
  tapCounter = 0;

Template.cc.onCreated(function() {
  this.subscribe('gestures', session);
  this.subscribe('keyboard', session);
  this.subscribe('locations', session);


  // https://stackoverflow.com/questions/20194722/can-you-get-a-users-local-lan-ip-address-via-javascript
  window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection; //compatibility for Firefox and chrome
  var pc = new RTCPeerConnection({
      iceServers: []
    }),
    noop = function() {};
  pc.createDataChannel(''); //create a bogus data channel
  pc.createOffer(pc.setLocalDescription.bind(pc), noop); // create offer and set local description
  pc.onicecandidate = function(ice) {
    if (ice && ice.candidate && ice.candidate.candidate) {
      var myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)[1];
      console.log('my IP: ', myIP);
      pc.onicecandidate = noop;

      var QRCode = require('qrcode')

      var url;
      if (Meteor.isDevelopment) {
        url = "ws://" + myIP + ":3000/websocket?" + session;
      } else {
        url = "ws://rppt.meteorapp.com/websocket?" + session;
      }

      console.log(url);
      QRCode.toDataURL(url, function(err, url) {
        document.getElementById('qrcode-image').src = url
      })
    }
  };
});

Template.cc.onRendered(function() {
  Meteor.call('createTaskEntry', session);
  Meteor.call('clearGestures', session);
  Meteor.call('clearMessages', session);

  $(window).bind('beforeunload', () => {
    Meteor.call('cleanupStreams', session);
  });

  Gestures.find().observeChanges({
    added: function(id, fields) {
      if (fields.action == 'tap') {
        showTap(fields.x, fields.y);
        Gestures.remove({
          _id: id
        });
      }
    }
  });

  Keyboard.find().observeChanges({
    added: function(id, fields) {
      $('#user-messages-internal').append("<p>".concat(fields.text, "</p>"));
    }
  });

  let mapOptions = {
      zoom: 15
    },
    map = new google.maps.Map(document.getElementById('map'), mapOptions),
    marker = new google.maps.Marker({
      map: map
    });

  let position = new google.maps.LatLng(37.33167558501772, -122.030189037323);
  map.setCenter(position);
  Locations.find().observeChanges({
    added: function(id, fields) {
      let position = new google.maps.LatLng(fields.lat, fields.lng);
      marker.setMap(null);
      marker = new google.maps.Marker({
        map: map,
        position: position
      });
      map.setCenter(position);
    }
  });

  Meteor.call('webCreateStream', session, 'publisher', function(err, cred) {
    if (err) {
      alert(err);
    } else {
      let stream = OT.initSession(cred.key, cred.stream);
      stream.connect(cred.token, function(err) {
        // make publisher element on cc same dimensions as camera stream
        var properties = {
          width: 320,
          height: 240,
          mirror: false
        };
        publisher = OT.initPublisher('publisher', properties);
        stream.publish(publisher);
      });
      Meteor.call('webCreateStream', session, 'subscriber', function(err, cred) {
        if (err) {
          alert(err);
        } else {
          let stream = OT.initSession(cred.key, cred.stream);
          stream.connect(cred.token);
          stream.on("streamCreated", function(event) {
            let properties = {
              width: 375,
              height: 667,
              name: 'iOS Stream',
              mirror: false,
              style: {
                audioLevelDisplayMode: 'on',
                buttonDisplayMode: 'off'
              }
            };
            stream.subscribe(event.stream, 'paper', properties);
          });
        }
      });
    }
  });

});

Template.cc.helpers({
  sessionKey: function() {
    return session;
  }
});

// Generate session key strings
function createSession() {
  let max = 99999,
    min = 10000;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function clearSession() {
  Meteor.call('clearSession', {
    session: session
  });
}

function showTap(x, y) {
  console.log('Show tap: ', x, ' ', y);
  let id = createTap(x, y);
  setTimeout(function() {
    clearTap(id);
  }, 500);
}

function createTap(x, y) {
  let statusBarOffset = 5;
  let leftRightOffset = -5; // hacky, there should be a better way

  let div = document.createElement('div');
  div.style.left = `${x + leftRightOffset}px`;
  div.style.top = `${y + statusBarOffset}px`;
  div.className = 'tap-indicator';
  div.setAttribute('id', `tapCircle${tapCounter}`);
  tapCounter += 1;

  $('#paper-wrapper').append(div);
  return tapCounter - 1;
}

function clearTap(tapId) {
  $(`#tapCircle${tapId}`).remove();
}
