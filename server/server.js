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
var dt = .05;
function startGame(){
  createObstacles();
  setInterval(step, 1000*dt);
}
function createObstacles(){
  for (var i = 0; i < 100; i++){
    var x = 5 * i;
    var boundary = new Physics.RectBody({
      length: 10, width : 1, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(x, 10)
    });
    staticBodies.push(boundary);
    boundary = new Physics.RectBody({
      length: 10, width : 1, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(x, -10)
    });
    staticBodies.push(boundary);
  }
  world = new Physics.World();
  for (var i = 0; i < staticBodies.length; i++){
    world.addBody(staticBodies[i]);
  }
}
function step(){
  for (var i in cars){
    var c = cars[i];
    c.updateInputs(controls[i],dt);
    c.step(dt);
  }
  world.step(dt);
  io.sockets.emit('gameState', generatePState());
}
function generatePState(){
  var out = {};
  for (var i in cars){
    var c = cars[i];
    out[i] = {
      gas : c.gas,
      brake : c.brake,
      eBrake : c.eBrake,
      steerAngle : c.steerAngle,
      netWheelForce : c.netWheelForce,
      body : {
        position : c.body.position,
        velocity : c.body.velocity,
        angle : c.body.angle,
        angleVelocity : c.body.angleVelocity
      }
    };
  }
  return out;
}
io.on('connection', client => {
  client.on('joinGame', handleJoinGame);
  client.on('keydown', handleKeydown);
  client.on('keyup', handleKeyup);
  function handleJoinGame(){
    controls[client.id] = new UserControls();
    cars[client.id] = new Car();
    world.addBody(cars[client.id].body);
    client.emit('startState', {
      id : client.id,
      staticBodies : staticBodies,
      cars : cars
    });
    io.sockets.emit('join', {
      id : client.id,
      car : cars[client.id]
    });
  }
  function handleKeydown(k){
    controls[client.id].keyDown(k);
  }
  function handleKeyup(k){
    controls[client.id].keyUp(k);
  }
});
// io.listen(process.env.PORT || 3000);
io.listen(3000);


startGame();
