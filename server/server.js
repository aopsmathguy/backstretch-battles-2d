const io = require('socket.io')();
const { MyMath } = require('./mymath.js');
const { Vector } = require('./vector.js');
const { UserControls } = require('./controls.js');
const { Physics } = require('./physics.js');
const { Car } = require('./car.js');
var controls = {};
var cars = {};
var staticBodies = [];
var world;
function createObstacles(){
  for (var i = 0; i < 100000; i++){
    var x = 5 * i;
    var boundary = new Physics.RectBody(10,1, Infinity, 0.2,0.3,0.3);
    boundary.position = new Vector(x, 20);
    staticBodies.add(boundary);
    boundary = new Physics.RectBody(10,1, Infinity, 0.2,0.3,0.3);
    boundary.position = new Vector(x, 0);
    staticBodies.add(boundary);
  }
  for (var i = 0; i < staticBodies.length; i++){
    world.addBody(staticBodies[i]);
  }
}
io.on('connection', client => {
  client.on('keydown', handleKeydown);
  client.on('joinGame', handleJoinGame);
  function handleJoinGame(){
    controls[client.id] = new UserControls();
    cars[client.id] = new Car();
  }
});
io.listen(process.env.PORT || 3000);
