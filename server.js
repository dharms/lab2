var express = require('express');
var session = require('express-session');
var app = express();

var crypto = require('crypto');

var server = require('http').Server(app);
var io = require('socket.io')(server);

var redis = require('redis');
var db = redis.createClient();

// setup things
app.set('views', './views');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

app.use("/static", express.static(__dirname + '/static'));
app.use(session({secret: 'toiuqh29872tgjsdoiuLKGSOIULlkjgsj0'}))

// socket things
io.on('connection', function(socket){
  io.emit('user move');
  console.log('a user connected');
  socket.on('user move', function(msg){
    io.emit('user move', msg);
  });
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  socket.on('disconnect', function(){
    console.log('a user disconnected');
  });
});

app.post('/login/:username/:password1', function(req, res){
  //don't like having it in the url..
  //but i guess it's the same
  //need to do some validation here
  var username = req.params.username;
  var password1 = req.params.password1;

  db.hget("users", username, function(err, reply) {
    if (err){
      res.set({'Content-Type': 'application/json'});
      res.status(200);
      res.send({'error':"Error with username database."});
    }
    if (reply == null){
      console.log('Username doesn\'t exist; creating new user: '+username);
      var shasum = crypto.createHash('sha1');
      shasum.update(password1);
      var d = shasum.digest('hex');
      db.hset(["users", username, d], function(err, reply) {
        if (err){
          console.log(err);
        }
      });

      var sess = req.session;
      sess.user = {"id":username,
        "name":username,
    "inventory":["towel"],
    "where":"strong-hall"
      }
      logged_in.push(sess.user);

      res.set({'Content-Type': 'application/json'});
      res.status(200);
      res.send({'success':"User created."});
    } else {
      console.log('Attempted login: '+username);
      var shasum = crypto.createHash('sha1');
      shasum.update(password1);
      var d = shasum.digest('hex');
      if (d == reply){

        var sess = req.session;
        sess.user = {"id":username,
          "name":username,
          "inventory":["towel"],
          "where":"strong-hall"
        }
        logged_in.push(sess.user);

        var msg = username + " logged in.";
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        console.log(msg);
        res.send({'success':msg});      
      } else {
        console.log('Invalid password entered for username: ' + username);
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send({'error':"Invalid password."});
      }
    }
  });


});

app.get('/signup/', function(req, res){
  res.status(200);
  res.render('signup', {});
});

app.post('/signup/:username/:password1/:password2', function(req, res){
  //don't like having it in the url..
  //but i guess it's the same
  //need to do some validation here
  var username = req.params.username;
  var password1 = req.params.password1;
  var password2 = req.params.password2;
  console.log('Attempted create: '+username);
  if (password1 == password2){
    console.log('Passwords match for: '+username);
    db.hget("users", username, function(err, reply) {
      if (err){
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send({'error':"Error with username database."});
      }
      if (reply == null){
        console.log('Username doesn\'t exist; creating new user: '+username);
        //make a new user
        var shasum = crypto.createHash('sha1');
        shasum.update(password1);
        var d = shasum.digest('hex');
        db.hset(["users", username, d], function(err, reply) {
          if (err){
            console.log(err);
          }
        });
        var sess = req.session;
        sess.user = {"id":username,
          "name":username,
      "inventory":["towel"],
      "where":"strong-hall"
        }

        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send({'success':"User created."});
      } else {
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send({'error':"Username is taken."});

      }
    });
  } else {
    console.log('Passwords don\'t match for: '+username);
    res.set({'Content-Type': 'application/json'});
    res.status(200);
    res.send({'error':"Passwords don't match"});

  }

});


//home
app.get('/', function(req, res){
  var sess = req.session;
  if (sess.user){
    console.log("Session has user: " + sess.user.id );
    for (var i in logged_in) {
      if (sess.user.id == logged_in[i].id) {
        if (i >= 0) {
          logged_in.splice(i, 1); // force logout
        }
      }
    }
    db.hget("locations", sess.user.id, function(err, reply) {
      if (err){
        res.render('index', { user: sess.user});
      }
      sess.user.where = reply;
      logged_in.push(sess.user);
    console.log("Sending to index user: " + sess.user.id );
      res.render('index', { user: sess.user});
    });
  } else {
    console.log('No user in session, directing to login');
    res.status(200);
    //res.send('hey');
    //todo: some problem here, sometimes login page won't render
    res.render('login');
  }
});

app.get('/users', function(req, res){
  res.set({'Content-Type': 'application/json'});
  res.status(200);
  res.send(logged_in);
  return;
});

app.get('/:user/inventory', function(req, res){
  var user = '';
  for (var i in logged_in){
    if (req.params.user == logged_in[i].id) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    res.set({'Content-Type': 'application/json'});
    res.status(200);
    res.send(user.inventory);
    return;
  }
  res.status(404);
  res.send("not found, sorry");
  return;
});

app.put('/:user/:where', function(req, res){
  var user = '';
  for (var i in logged_in){
    if (req.params.user == logged_in[i].id) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    for (var i in campus) {
      if (req.params.where == campus[i].id) {
        user.where = req.params.where;
        db.hset(["locations", user.id, user.where], function(err, reply) {
          if (err){
            console.log(err);
          }
        });

        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send('');
        io.emit('user move');
        return;
      }
    }
  }
  res.status(404);
  res.send("not found, sorry");
});


app.get('/:where', function(req, res){
  for (var i in campus) {
    if (req.params.where == campus[i].id) {
      res.set({'Content-Type': 'application/json'});
      res.status(200);
      res.send(campus[i]);
      return;
    }
  }
  res.status(404);
  res.send("not found, sorry");
});


app.get('/:where/items', function(req, res){
  for (var i in campus) {
    if (req.params.where == campus[i].id) {
      if (campus[i].items == undefined) {
        campus[i].items = [];
      }
      res.set({'Content-Type': 'application/json'});
      res.status(200);
      res.send(campus[i].items);
      return;
    }
  }
  res.status(404);
  res.send("not found, sorry");
});

app.get('/images/:name', function(req, res){
  res.status(200);
  res.sendFile(__dirname + "/static/images/" + req.params.name);
});

app.delete('/:user/:where/:item', function(req, res){
  var user = '';
  for (var i in logged_in){
    if (req.params.user == logged_in[i].id) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    for (var i in campus) {
      if (req.params.where == campus[i].id) {
        res.set({'Content-Type': 'application/json'});
        var ix = -1;
        if (campus[i].items != undefined) {
          ix = campus[i].items.indexOf(req.params.item);
        }
        if (ix >= 0) {
          res.status(200);
          user.inventory.push(campus[i].items[ix]); // stash
          res.send(user.inventory);
          campus[i].items.splice(ix, 1); // room no longer has this
          io.emit('item move');
          return;
        }
        res.status(200);
        res.send([]);
        io.emit('item move');
        return;
      }
    }
  }
  res.status(404);
  res.send("location not found");
});

app.post('/:where/:user/:message', function(req, res){
  var user = '';
  for (var i in logged_in){
    if (req.params.user == logged_in[i].id) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    for (var i in campus) {
      if (req.params.where == campus[i].id) {
        if (campus[i].messages == undefined) {
          campus[i].messages = [];
        }

        campus[i].messages.push([req.params.message, req.params.user]);

        if (req.params.message == 'take boat'){
          campus[i].text	+= " YOU GOT A BOAT AND YOU WIN!"
        }
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send('yay');
        return;
      }
    }
  }
  res.status(404);
  res.send("not found, sorry");
});

app.put('/:user/:where/:item', function(req, res){
  var user = '';
  for (var i in logged_in){
    if (req.params.user == logged_in[i].id) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    for (var i in campus) {
      if (req.params.where == campus[i].id) {
        // Check you have this
        var ix = user.inventory.indexOf(req.params.item);
        if (ix >= 0) {
          dropbox(user, ix,campus[i]);
          res.set({'Content-Type': 'application/json'});
          res.status(200);
          res.send([]);
          io.emit('item move');
        } else {
          res.status(404);
          res.send("you do not have this");
        }
        return;
      }
    }
  }
  res.status(404);
  res.send("location not found");
});

server.listen(3000);

var dropbox = function(user, ix, room) {
  var item = user.inventory[ix];
  user.inventory.splice(ix, 1);	 // remove from inventory
  // winning condition
  if (room.id == 'allen-fieldhouse' && item == "basketball") {
    room.text	+= " Someone found the ball so there is a game going on!"
      return;
  }
  if (room.items == undefined) {
    room.items = [];
  }
  room.items.push(item);
}

var logged_in = []

var user_bank = ["Bubblegum", "LSP", "Finn", "Jake", "An Ice King", "Marceline", "BMO"]
var user_id_bank = ["Bubblegum", "LSP", "Finn", "Jake", "An-Ice-King", "Marceline", "BMO"]

var campus =
[ { "id": "lied-center",
  "picture": "LiedCenter.jpg",
  "next": {"east": "eaton-hall", "south": "dole-institute"},
  "text": "Outside the Lied Center"
},
{ "id": "dole-institute",
  "picture": "DoleInstituteofPolitics.jpg",
  "next": {"east": "allen-fieldhouse", "north": "lied-center"},
  "text": "You take in the view of the Dole Institute of Politics. This is the best part of your walk to Nichols Hall."
},
{ "id": "eaton-hall",
  "picture": "EatonHall.jpg",
  "next": {"east": "snow-hall", "south": "allen-fieldhouse", "west": "lied-center"},
  "text": "Outside Eaton Hall. You should recognize here."
},
{ "id": "snow-hall",
  "picture": "SnowHall.jpg",
  "next": {"east": "strong-hall", "south": "ambler-recreation", "west": "eaton-hall"},
  "text": "Outside Snow Hall. Math class? Waiting for the bus?"
},
{ "id": "strong-hall",
  "picture": "StrongHall.jpg",
  "next": {"east": "outside-fraser", "north": "memorial-stadium", "west": "snow-hall"},
  "items": ["coffee"],
  "text": "Outside Stong Hall"
},
{ "id": "ambler-recreation",
  "picture": "AmblerRecreation.jpg",
  "next": {"west": "allen-fieldhouse", "north": "snow-hall"},
  "text": "It's the starting of the semester, and you feel motivated to be at the Gym. Let's see about that in 3 weeks."
},
{ "id": "outside-fraser",
  "picture": "OutsideFraserHall.jpg",
  "next": {"west": "strong-hall","north":"spencer-museum"},
  "items": ["basketball"],
  "text": "On your walk to the Kansas Union, you wish you had class outside."
},
{ "id": "spencer-museum",
  "picture": "SpencerMuseum.jpg",
  "next": {"south": "outside-fraser","west":"memorial-stadium"},
  "items": ["art"],
  "text": "Outside Spencer Museum of Art"
},
{ "id": "memorial-stadium",
  "picture": "MemorialStadium.jpg",
  "next": {"south": "strong-hall","east":"spencer-museum"},
  "items": ["ku flag"],
  "text": "Half the crowd is wearing KU Basketball gear at the football game."
},
{ "id": "allen-fieldhouse",
  "picture": "AllenFieldhouse.jpg",
  "next": {"north": "eaton-hall","east": "ambler-recreation","west": "dole-institute"},
  "text": "Rock Chalk! Allen field house"
}
]
