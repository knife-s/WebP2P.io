var inherits = require('inherits');

var Manager = require('./Manager');

var Connector_DataChannel = require('../connectors/core/DataChannel');


/**
 * @classdesc Manager of the communications with the other peers
 *
 * @constructor
 */
function PeersManager(rpcBuilder, routingLabel)
{
  Manager.call(this, rpcBuilder);

  var self = this;


  function createConnector(channel)
  {
    var connector = new Connector_DataChannel(channel);

    self._initConnector(connector);

    return connector;
  };


  var peers = {};

  this.__defineGetter__("peers", function()
  {
    return peers;
  });


  function initDataChannel(channel, sessionID)
  {
    if(channel.label == routingLabel)
    {
      var connector = createConnector(channel);
          connector.sessionID = sessionID;

      return connector;
    };
  };

  this.add = function(sessionID, peerConnection, channels)
  {
    peerConnection.addEventListener('signalingstatechange', function(event)
    {
      // Remove the peer from the list of peers when gets closed
      if(peerConnection.signalingState == 'closed')
        delete peers[sessionID];
    });

    // Connection initiator
    if(channels.length)
    {
      // Only init the routing functionality on the routing channel
      for(var i=0, channel; channel=channels[i]; i++)
        if(initDataChannel(channel, sessionID))
          break;
    }

    // Connection receiver
    else
    {
      function initDataChannel_listener(event)
      {
        var channel = event.channel;

        var connector = initDataChannel(channel, sessionID);
        if(connector)
          event.target.removeEventListener('datachannel', initDataChannel_listener);
      };

      peerConnection.addEventListener('datachannel', initDataChannel_listener);
    };

    // Add PeerConnection to the list of enabled ones
    peers[sessionID] = peerConnection;
  };

  this.get = function(sessionID)
  {
    return peers[sessionID];
  };

  var _close = this.close;
  this.close = function()
  {
    for(var id in peers)
      peers[id].close();

    _close.call(this);
  };
};
inherits(PeersManager, Manager);


module.exports = PeersManager;