const io = require('socket.io')();
const { MyMath } = require('./mymath.js');
const { Vector } = require('./vector.js');
const { UserControls } = require('./controls.js');
const { Physics } = require('./physics.js');
const { Car } = require('./car.js');
var controls = {};
var carWorld;
var newParticlesIdx;
var staticBodies = [];
var world;
var dt = .008;
var emitPeriod = 4;
var e = 0;
function startGame(){
  carWorld = new Car.World();
  newParticlesIdx = [];
  createObstacles();
  setInterval(step, 1000*dt);
}
function createObstacles(){
  for (var i = 0; i < 300; i++){
    var x = 20 * i;
    var boundary = new Physics.RectBody({
      length: 20, width : 1, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(x, 10)
    });
    staticBodies.push(boundary);
    boundary = new Physics.RectBody({
      length: 20, width : 1, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(x, -10)
    });
    staticBodies.push(boundary);
  }
  world = new Physics.World();
  for (var i = 0; i < staticBodies.length; i++){
    world.addBody(staticBodies[i]);
  }
}
function step(){
  for (var i in carWorld.cars){
    var c = carWorld.cars[i];
    c.updateInputs(controls[i], dt);
  }
  carWorld.step(dt);
  var addIdx = carWorld.addCarParticles();
  for (var i = 0; i < addIdx.length; i++){
    var idx = addIdx[i];
    newParticlesIdx.push(idx);
  }
  world.step(dt);
  e++;
  if (e >= emitPeriod){
    e = 0;
    io.sockets.emit('gameState', {time : Date.now(), cars : generatePState(), newParticles : getNewParticles()});
    newParticlesIdx = [];
  }
}
function generatePState(){
  var out = {};
  out.particles = {};
  for (var i in carWorld.cars){
    var c = carWorld.cars[i];
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
function getNewParticles(){
  var out = [];
  for (var i = 0; i < newParticlesIdx.length; i++){
    var idx = newParticlesIdx[i];
    if (carWorld.pWorld.particles[idx] != undefined){
      out.push(carWorld.pWorld.particles[idx]);
    }
  }
  return out;
}
io.on('connection', client => {
  client.on('joinGame', handleJoinGame);
  client.on('disconnect', handleDisconnect);
  client.on('keydown', handleKeydown);
  client.on('keyup', handleKeyup);
  client.on('ping', handlePing);
  function handleJoinGame(){
    controls[client.id] = new UserControls();
    var c = new Car();
    carWorld.cars[client.id] = c;
    world.addBody(c.body);
    client.emit('startState', {
      id : client.id,
      staticBodies : staticBodies,
      cars : carWorld.cars,
      particles : carWorld.pWorld.particles,
      dt : dt
    });
    io.sockets.emit('join', {
      id : client.id,
      car : carWorld.cars[client.id]
    });
  }
  function handleDisconnect(){
    delete controls[client.id];
    if (carWorld.cars[client.id]){
      world.removeBody(carWorld.cars[client.id].body);
    }
    delete carWorld.cars[client.id];
    io.sockets.emit('leave', {
      id : client.id
    });
  }
  function handleKeydown(k){
    if (controls[client.id]){
      controls[client.id].keyDown(k);
    }
  }
  function handleKeyup(k){
    if (controls[client.id]){
      controls[client.id].keyUp(k);
    }
  }
  function handlePing(t){
    var servTime = Date.now();
    client.emit('pong', {cTime : t, sTime : servTime});
  }
});
startGame();
io.listen(process.env.PORT || 3000);
