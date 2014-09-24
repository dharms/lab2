// first: one hash, 'users' username, id
// second: a hash for each user's info: user:1 - username, password, where, inventory_id 
//// db.hmset(["user:"+user_id, 'username', username, 'password', d, 'where', 'strong-hall'], function(err, reply) {
// list for the inventory
//

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
  var user = '';
  for (var i in logged_in){
    if (username  == logged_in[i].username) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    console.log(username+' is already logged in.');
    res.set({'Content-Type': 'application/json'});
    res.status(200);
    res.send({'error':"User '" + username + "' is already logged in."});
  } else {
    db.hget("users", username, function(err, reply) {
      if (err){
        console.log('"Users" error getting user: '+username+': '+err);
        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send({'error':"Error with username database."});
      }
      var user_id = reply;
      db.hget("user:"+user_id, 'password', function(err, reply) {
        if (err){
          console.log('"Users" error getting user: '+username+': '+err);
          res.set({'Content-Type': 'application/json'});
          res.status(200);
          res.send({'error':"Error with username database."});
        }
        if (reply == null){
          console.log('Username ' + username + ' doesn\'t exist.');
          res.set({'Content-Type': 'application/json'});
          res.status(200);
          res.send({'error':"Username doesn't exist."});
        } else {
          console.log('Attempted login: '+username);
          var shasum = crypto.createHash('sha1');
          shasum.update(password1);
          var d = shasum.digest('hex');
          if (d == reply){
            var sess = req.session;
            sess.user = {"id":user_id,
              "username":username,
            }
            db.hget("user:"+user_id, 'where', function(err, reply) {
              if (err){
                console.log(err);
              }
              sess.user.where=reply;

              var msg = username + " logged in.";
              res.set({'Content-Type': 'application/json'});
              res.status(200);
              console.log(msg);
              res.send({'success':msg});      
            });
          } else {
            console.log('Invalid password entered for username: ' + username);
            res.set({'Content-Type': 'application/json'});
            res.status(200);
            res.send({'error':"Invalid password."});
          }
        }
      });
    });
  }
});

app.get('/logout/', function(req, res){
  var sess = req.session;
  var user = sess.user;
  for (var i in logged_in) {
    if (user.id == logged_in[i].id) {
      if (i >= 0) {
        logged_in.splice(i, 1); // force logout
      }
    }
  }
  req.session.user = '';
  res.redirect('/');
});

app.get('/login/', function(req, res){
  res.status(200);
  res.render('login', {});
});

app.get('/signup/', function(req, res){
  res.status(200);
  res.render('signup', {});
});

app.post('/signup/:username/:password1/:password2', function(req, res){
  //don't like having it in the url..
  //but i guess it's the same
  //need to do some validation here
  var sess = req.session;
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
        var id = '' 
      db.incr("user_id", function (err, reply){
        if (err){
          console.log(err);
        }
        user_id = reply;
        console.log('user_id: ' + user_id + ' for ' + username );
        db.hset('users', username, user_id, function(err, reply) {
          if (err){
            console.log(err);
          }
          console.log(reply);
        });
        db.hmset(["user:"+user_id, 'username', username, 'password', d, 'where', 'strong-hall'], function(err, reply) {
          if (err){
            console.log(err);
          }
          console.log(reply);
        });
        db.lpush('inventory:user'+user_id, 'towel');
        sess.user = {"id":user_id,
          "username":username,
          "where":"strong-hall"
        }
        console.log('Successfully made user ' + username + ' with id ' + sess.user.id);

        res.set({'Content-Type': 'application/json'});
        res.status(200);
        res.send({'success':"User created."});
      });
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
    db.hget("users", sess.user.id, function(err, reply) {
      if (err){
        console.log(err);
      }
      if (reply){
        console.log('From / with ' + sess.user.id + ' got: ' + reply);
      }
      logged_in.push(sess.user);
      console.log("Sending user: " + sess.user.username + " to index." );
      res.render('index', { user: sess.user});
    });
  } else {
    console.log('No user in session, directing to login');
    res.status(200);
    //todo: some problem here, sometimes login page won't render
    res.redirect('login');
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
    db.lrange('inventory:user'+user.id, '0', '-1', function(err, reply){
      if (err){
        console.log(err);
      }
      res.set({'Content-Type': 'application/json'});
      res.status(200);
      res.send(reply);
      return;
    });
  }
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
        db.hset(["user:"+user.id, 'where', user.where], function(err, reply) {
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
  console.log('Deleting ' + req.params.item + ' from ' + req.params.where);
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
          db.lpush('inventory:user'+user.id, campus[i].items[ix]);
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
  console.log('Putting ' + req.params.item + ' in ' + req.params.where);
  var user = '';
  var item = req.params.item;
  for (var i in logged_in){
    if (req.params.user == logged_in[i].id) {
      user = logged_in[i];
    }
  }
  if (user != ''){
    for (var i in campus) {
      if (req.params.where == campus[i].id) {
        // Check you have this
        var remove = db.lrem('inventory:user'+user.id, '1', item);
        if (remove != 0) {
          if (campus[i].items == undefined) {
            campus[i].items = [];
          }
          campus[i].items.push(item);

          res.set({'Content-Type': 'application/json'});
          res.status(200);
          res.send([]);
        } else {
          res.status(404);
          res.send("you do not have this");
        }
        io.emit('item move');
        return;
      }
    }
  }
  res.status(404);
  res.send("location not found");
});

server.listen(3000);

// winning condition
//if (room.id == 'allen-fieldhouse' && item == "basketball") {
//room.text	+= " Someone found the ball so there is a game going on!"
//}

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
