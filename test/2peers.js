QUnit.module("2 peers");


//  Connect to only one new peer over PubNub
var options1 =
{
  handshake_servers:
  [
    {
      type: "PubNub",
      config_init:
      {
        publish_key  : "pub-6ee5d4df-fe10-4990-bbc7-c1b0525f5d2b",
        subscribe_key: "sub-e5919840-3564-11e2-b8d0-c7df1d04ae4a",
        ssl          : true
      },
      config_mess:
      {
        channel: "ShareIt"
      }
    }
  ],
  uid: "Peer 1"
};

// Connect to current peers over PubNub
var options2 =
{
  handshake_servers:
  [
    {
      type: "PubNub",
      config_init:
      {
        publish_key  : "pub-6ee5d4df-fe10-4990-bbc7-c1b0525f5d2b",
        subscribe_key: "sub-e5919840-3564-11e2-b8d0-c7df1d04ae4a",
        ssl          : true
      },
      config_mess:
      {
        channel: "ShareIt"
      }
    }
  ],
  uid: "Peer 2"
};


test("Connect two peers to PubNub at the same time", function()
{
  var pendingTests = 2;

  expect(pendingTests);
  stop(pendingTests);

  var conn1 = new WebP2P(options1);
  var conn2 = new WebP2P(options2);

  function tearDown()
  {
    if(--pendingTests <= 0)
    {
      conn1.close();
      conn2.close();
    };

    start();
  };

  // Conn 1

  conn1.on('connected', function()
  {
    ok(true, "Conn1 SessionID: "+conn1.sessionID);

    tearDown()
  });

  conn1.on('error', function(error)
  {
    ok(false, "Conn1 error: "+error);

    tearDown()
  });

  // Conn 2

  conn2.on('connected', function()
  {
    ok(true, "Conn2 SessionID: "+conn2.sessionID);

    tearDown()
  });

  conn2.on('error', function(error)
  {
    ok(false, "Conn2 error: "+error);

    tearDown()
  });
});


test("Interconnect two peers", function()
{
  var pendingTests = 2;

  expect(2*pendingTests);
  stop(pendingTests);

  var conn1 = new WebP2P(options1);
  var conn2 = new WebP2P(options2);

  function tearDown()
  {
    if(--pendingTests <= 0)
    {
      conn1.close();
      conn2.close();
    };

    start();
  };

  // Conn 1

  conn1.on('peerconnection', function(peerconnection)
  {
    ok(true, "Conn1 PeerConnection: "+peerconnection.sessionID);

    var peers = Object.keys(conn1.peers);

    equal(peers.length, 1, "Conn1 peers: "+peers);

    tearDown();
  });

  conn1.on('error', function(error)
  {
    ok(false, "Conn1 error: "+error);

    tearDown();
  });

  // Conn 2

  conn2.on('peerconnection', function(peerconnection)
  {
    ok(true, "Conn2 PeerConnection: "+peerconnection.sessionID);

    var peers = Object.keys(conn2.peers);

    equal(peers.length, 1, "Conn2 peers: "+peers);

    tearDown();
  });

  conn2.on('error', function(error)
  {
    ok(false, "Conn2 error: "+error);

    tearDown();
  });
});


test("Disconnect a peer from handshake channel after connecting to other peer",
function()
{
  expect(8);
  stop(2);

  // Conn 1

  var options1 =
  {
    handshake_servers:
    [
      {
        type: "PubNub",
        config_init:
        {
          publish_key  : "pub-6ee5d4df-fe10-4990-bbc7-c1b0525f5d2b",
          subscribe_key: "sub-e5919840-3564-11e2-b8d0-c7df1d04ae4a",
          ssl          : true
        },
        config_mess:
        {
          channel: "ShareIt"
        },
        max_connections: 1
      }
    ],
    uid: "Peer 1"
  };

  var conn1 = new WebP2P(options1);

  conn1.on('error', function(error)
  {
    ok(false, "Conn1 error: "+error);

    conn1.close();
    start();
  });

  conn1.on('handshakeManager.connected', function()
  {
    ok(true, "Conn1 handshakeManager.connect. SessionID: "+conn1.sessionID);

    conn1.on('handshakeManager.disconnected', function()
    {
      ok(true, 'Conn1 handshakeManager.disconnected');

      var peers = Object.keys(conn1.peers);

      equal(peers.length, 1, "Conn1 peers: "+peers);

      var status = conn1.status;
      equal(status, 'disconnected', 'Conn1 by HandshakeManager. status: '+status);

      conn1.on('peersManager.connected', function()
      {
        var status = conn1.status;
        equal(status, 'connected', 'Conn1 by PeersManager. status: '+status);

        conn1.close();
        start();
      });
    });


    // Conn 2

    var conn2 = new WebP2P(options2);

    conn2.on('peerconnection', function(peerconnection)
    {
      ok(true, "Conn2 PeerConnection: "+peerconnection.sessionID);

      var peers = Object.keys(conn2.peers);

      equal(peers.length, 1, "Conn2 peers: "+peers);

      var status = conn2.status;
      equal(status, 'connected', 'Conn2 status: '+status);

      conn2.close();
      start();
    });

    conn2.on('error', function(error)
    {
      ok(false, "Conn2 error: "+error);

      conn2.close();
      start();
    });
  });
});


test("Exchange data between two peers", function()
{
  var pendingTests = 4;

  expect(pendingTests);
  stop(pendingTests);

  options1.commonLabels = ['test'];
  options2.commonLabels = ['test'];

  var conn1 = new WebP2P(options1);
  var conn2 = new WebP2P(options2);


  function tearDown()
  {
    if(--pendingTests <= 0)
    {
      conn1.close();
      conn2.close();
    };

    start();
  };


  function initChannel(channel, ping, pong)
  {
    if(channel.label == 'test')
    {
      channel.addEventListener('message', function(event)
      {
        var message = event.data;

        equal(message, pong, 'Received message: '+event.data);

        tearDown();
      });

      function send()
      {
        channel.send(ping);

        tearDown();
      };

      if(channel.readyState == 'open')
        send()
      else
        channel.addEventListener('open', send);
    }
  };


  // Conn 1

  conn1.on('peerconnection', function(peerconnection, channels)
  {
    ok(true, "Conn1 PeerConnection: "+peerconnection.sessionID);

    if(channels.length)
    {
      console.log("Conn1 channels",channels);

      for(var i=0, channel; channel=channels[i]; i++)
        initChannel(channel, 'conn1', 'conn2');
    }

    else
      peerconnection.addEventListener('datachannel', function(event)
      {
        var channel = event.channel;
        var label = channel.label;

        console.log("Conn1 datachannel: "+label);

        initChannel(channel, 'conn1', 'conn2');
      });
  });

  conn1.on('error', function(error)
  {
    ok(false, "Conn1 error: "+error);
    tearDown();
  });


  // Conn 2

  conn2.on('peerconnection', function(peerconnection, channels)
  {
    ok(true, "Conn2 PeerConnection: "+peerconnection.sessionID);

    if(channels.length)
    {
      console.log("Conn2 channels",channels);

      for(var i=0, channel; channel=channels[i]; i++)
        initChannel(channel, 'conn2', 'conn1');
    }

    else
      peerconnection.addEventListener('datachannel', function(event)
      {
        var channel = event.channel;
        var label = channel.label;

        console.log("Conn2 datachannel: "+label);

        initChannel(channel, 'conn2', 'conn1');
      });
  });

  conn2.on('error', function(error)
  {
    ok(false, "Conn2 error: "+error);
    tearDown();
  });
});