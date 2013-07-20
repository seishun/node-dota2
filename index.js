module.exports = Dota2;

require('util').inherits(Dota2, require('events').EventEmitter);

function Dota2(steamClient) {
  require('events').EventEmitter.call(this);
  
  this._client = steamClient;
  this._client.on('fromGC', function(appID, type, body, args) {
    if (appID != 570) {
      return;
    }
    // console.log(type & ~protoMask)
    var handler = Dota2._handlers[type & ~protoMask];
    if (handler) {
      handler.call(this, body, args);
    } else {
      // console.log(type & ~protoMask)
    }
  }.bind(this));
}

var ProtoBuf = require('protobufjs');

var builder = ProtoBuf.protoFromFile(__dirname + '/SteamKit/Resources/Protobufs/dota/dota_gcmessages.proto');
ProtoBuf.protoFromFile(__dirname + '/SteamKit/Resources/Protobufs/dota/gcsdk_gcmessages.proto', builder);
ProtoBuf.protoFromFile(__dirname + '/SteamKit/Resources/Protobufs/dota/gcsystemmsgs.proto', builder);
var root = builder.build();

var protoMask = 0x80000000;

Dota2._handlers = {};
Dota2.methods = {};
Dota2.events = {};

[root.EDOTAGCMsg, root.EGCBaseClientMsg].forEach(function(eMsgs) {
  Object.keys(eMsgs).forEach(function(eMsg) {
    var components = eMsg.match(/k_EMsg(?:GC)?(?:DOTA)?((.*?)(?:Request)?(Response)?)$/);
    var msgType = eMsgs[eMsg]; // Number
    if (components[3]) {
      // Responses are handled as part of their corresponding requests
      return;
    }
    // find corresponding message
    var Message = root['CMsg' + components[1]] || root['CMsgDOTA' + components[1]] || root['CMsgGC' + components[1]];
    if (!Message) {
      // console.log('no message for ' + eMsg);
      return;
    }
    // check if there is a response to this message
    var Response = root[Message.name.replace(/Request$/, '') + 'Response'];
    var camelCase = components[2][0].toLowerCase() + components[2].slice(1);
    Dota2.prototype[camelCase] = function(object) {
      // if this message is JobID-based, we should pass any extra arguments to the event handler
      var args = Array.prototype.slice.call(arguments, 1);
      this._client.toGC(570, msgType | protoMask, new Message(object).toBuffer(), args);
    };
    
    // docs for method
    Dota2.methods[camelCase] = buildDocs(builder.lookup(Message.name));
    
    // if it has a corresponding Response, generate an event handler for Response
    // otherwise, it could be either a responseless message sent to Steam (LeaveChatChannel) or a message sent both to and from Steam (ChatMessage)
    var EventMessage = Response || Message;
    Dota2._handlers[Response ? msgType + 1 : msgType] = function(body, args) {
      this.emit.apply(this, [camelCase, EventMessage.decode(body)].concat(args || []));
    };
    // docs for event
    Dota2.events[camelCase] = buildDocs(builder.lookup(EventMessage.name));
  });
});

function buildDocs(message) {
  var fields = {};
  message.getChildren(ProtoBuf.Reflect.Message.Field).forEach(function(field) {
    var type = field.type.name;
    if (type == 'message') {
      type = buildDocs(field.resolvedType);
    } else if (type == 'enum') {
      type = field.resolvedType.object;
    }
    fields[field.name] = field.repeated ? [type] : type;
  });
  return fields;
}
