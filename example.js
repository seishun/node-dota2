var Steam = require('steam');
var Dota2 = require('./');
var fs = require('fs');
var Long = require('long'); // you might need this to work with SteamIDs since they are 64-bit

if (fs.existsSync('servers.json')) {
    Steam.servers = JSON.parse(fs.readFileSync('servers.json'));
}

var client = new Steam.SteamClient();
var dota2 = new Dota2(client);

var username = 'username';
var password = 'password';

client.logOn({
  accountName: username,
  password: password,
  shaSentryfile: fs.readFileSync('sentry')
});

client.on('loggedOn', function() {
  console.log('Logged on');
  client.setPersonaState(Steam.EPersonaState.Online)
  client.gamesPlayed([570]);
  
  // apparently clientHello is required to join a chat now (this wasn't the case a few days ago)
  // also, clientHello no longer works immediately after gamesPlayed (again, it did a few days ago)
  setTimeout(function() {
    dota2.clientHello({});
  }, 1000);
});

// this comes in response to clientHello
dota2.on('clientWelcome', function() {
  console.log('clientWelcome');
  dota2.joinChatChannel({
    channel_name: 'Node.js',
    channel_type: Dota2.methods.joinChatChannel.channel_type.DOTAChannelType_Custom // or just 1
  });
});

dota2.on('joinChatChannel', function(res) {
  console.log('joinChatChannel');
  console.log(res);
});

dota2.on('chatMessage', function(res) {
  console.log('chatMessage');
  console.log(res);
  
  var name = res.persona_name;
  var channelID = res.channel_id;
  var msg = res.text.split(' ');
  if (msg[0] == '.whowon' && msg[1]) {
    dota2.matchDetails({
      match_id: msg[1]
    }, name, channelID); // you can pass any extra arguments
  }
});

// name and channelID are the same as passed to matchDetails method in the corresponding request
dota2.on('matchDetails', function(res, name, channelID) {
  console.log('matchDetails');
  // console.log(res);
  
  if (!res.match) {
    dota2.chatMessage({
      text: name + ': invalid match ID!',
      channel_id: channelID
    });
    return;
  }
  
  console.log('got info on ' + res.match.match_id);
  dota2.chatMessage({
    text: name + ': ' + (res.match.good_guys_win ? 'Radiant' : 'Dire') + ' won this match',
    channel_id: channelID
  });
});
