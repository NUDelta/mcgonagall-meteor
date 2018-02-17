session = createSession();
let panning = false,
  tapCounter = 0;

Template.cc.onCreated(function() {
  this.subscribe('gestures', session);
  this.subscribe('keyboard', session);
  this.subscribe('locations', session);
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
      zoom: 18
    },
    map = new google.maps.Map(document.getElementById('map'), mapOptions),
    marker = new google.maps.Marker({
      map: map
    });

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
          mirror: true
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
