var express = require('express');
var session = require('express-session');
var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

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

app.get('/', function(req, res){
  var sess = req.session;
  if (sess.user){
  } else {
    sess.user = {"id":user_id_bank.pop(),
      "name":user_bank.pop(),
  "inventory":["towel"],
  "location":"strong-hall"
    }
    logged_in.push(sess.user);
  }
  res.render('index', { user: sess.user});
});

app.get('/users', function(req, res){
  res.set({'Content-Type': 'application/json'});
  res.status(200);
  res.send(logged_in);
  return;
});

app.get('/:user/inventory', function(req, res){
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
        user.location = req.params.where;
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
