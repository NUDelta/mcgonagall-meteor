// var key = 'YOUR_API_KEY' // e.g. '45357722'
// var secret = 'YOUR_SECRET_KEY' // e.g. 'b69bc69eeb464847b4d85bab5fd9a69406a988e1'

key = 45357722;
var secret = Assets.getText('secret');

openTokClient = new OpenTokClient(key, secret);
