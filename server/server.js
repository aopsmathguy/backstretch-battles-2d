const io = require('socket.io')();
const { MyMath } = require('./mymath.js');
const { Vector } = require('./vector.js');
const { UserControls } = require('./controls.js');
const { Physics } = require('./physics.js');
const { Car } = require('./car.js');
io.on('connection', client => {
  client.on('joinGame', handleJoinGame);
  client.on('disconnect', handleDisconnect);
  client.on('keydown', handleKeydown);
  client.on('keyup', handleKeyup);
  client.on('ping', handlePing);
  function handleJoinGame(){
    controls[client.id] = new UserControls();
    carWorld.addCar({id : client.id});
    world.addBody(carWorld.getCar(client.id).body);
    client.emit('startState', {
      id : client.id,
      staticBodies : staticBodies,
      cars : carWorld.cars,
      startBarriers : startBarriers,
      finishLine : finishLine,
      state : state,
      particles : carWorld.pWorld.particles,
      dt : dt,
      draftPeriod : draftPeriod,
      d : d,
      serverTime : Date.now()
    });
    io.sockets.emit('join', {
      id : client.id,
      car : carWorld.getCar(client.id)
    });
  }
  function handleDisconnect(){
    delete controls[client.id];
    if (carWorld.getCar(client.id)){
      world.removeBody(carWorld.getCar(client.id).body);
    }
    carWorld.removeCar(client.id);
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
var controls = {};
var carWorld;
var newParticlesIdx;
var staticBodies = [];
var world;
var startBarriers;
var finishLine;
var state;//"wait", "countdown", "started", "ended"
var timer;
var COUNT_TIME = 10000;
var END_TIME = 10000;
var dt = .008;
var draftPeriod = 5;
var d = 0;
var emitPeriod = 16;
var e = 0;

function startGame(){
  carWorld = new Car.World();
  newParticlesIdx = [];
  createObstacles();
  state = "wait";
  timer = 0;
  setInterval(step, 1000*dt);
}
function createObstacles(){
  for (var i = 0; i < 500; i++){
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
  startBarriers = new Car.BarrierWorld({
    bodies : [
      new Physics.RectBody({
        length: 1, width : 20, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(10, 0)
      })
    ]
  });
  finishLine = new Car.FinishLine({body : new Physics.RectBody({
    length: 1, width : 20, mass : Infinity, kFriction : 0.2, sFriction : 0.3, elasticity : 0.4, position : new Vector(10000, 0)
  })});
  world = new Physics.World();
  for (var i = 0; i < staticBodies.length; i++){
    world.addBody(staticBodies[i]);
  }
  enableStartBarriers();
}
function step(){
  for (var i in carWorld.cars){
    var c = carWorld.getCar(i);
    c.updateInputs(controls[i], dt);
  }
  carWorld.step(dt);
  d++;
  if (d >= draftPeriod){
    d = 0;
    var addIdx = carWorld.addCarParticles();
    for (var i = 0; i < addIdx.length; i++){
      var idx = addIdx[i];
      newParticlesIdx.push(idx);
    }
  }
  world.step(dt);
  var stateChanged = updateState(dt);
  if (stateChanged){
    io.sockets.emit('newState', state);
  }
  e++;
  if (e >= emitPeriod){
    e = 0;
    emitGameState();
  }
}
function updateState(dt){
  switch(state){
    case "wait":
      if (carWorld.count >= 2){
        state = "countdown";
        timer = COUNT_TIME;
        return true;
      }
      return false;
    case "countdown":
      timer -= 1000 * dt;
      if (carWorld.count < 2){
        state = "wait";
        timer = 0;
        return true;
      }
      if (timer < 0){
        state = "started";
        timer = 0;
        disableStartBarriers();
        return true;
      }
      return false;
    case "started":
      if (carWorld.count < 2){
        state = "ended";
        timer = END_TIME;
        return true;
      }
      var winner = finishLine.checkCWorld(carWorld);
      if (winner != -1){
        state = "ended";
        timer = END_TIME;
        return true;
      }
      return false;
    case "ended":
      timer -= 1000 * dt;
      if (timer < 0){
        if (carWorld.count < 2){
          state = "wait";
          timer = 0;
        }
        else{
          state = "countdown";
          timer = COUNT_TIME;
        }
        enableStartBarriers();
        resetCars();
        return true;
      }
      return false;
  }
}
function resetCars(){
  for (var i in carWorld.cars){
    var car = carWorld.getCar(i);
    var body = car.body;
    body.position = new Vector(0,0);
    body.velocity = new Vector(0,0);
    body.angle = 0;
    body.angleVelocity = 0;
  }
}
function enableStartBarriers(){
  if (!startBarriers.enabled){
    startBarriers.enable(world);
    io.sockets.emit('startBarriersStateChange', true);
  }
}
function disableStartBarriers(){
  if (startBarriers.enabled){
    startBarriers.disable(world);
    io.sockets.emit('startBarriersStateChange', false);
  }
}
function emitGameState(){
  io.sockets.emit('gameState', {time : Date.now(), cars : generatePState(), newParticles : getNewParticles(), d : d});
  newParticlesIdx = [];
}
function generatePState(){
  var out = {};
  for (var i in carWorld.cars){
    var c = carWorld.getCar(i);
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
startGame();
io.listen(process.env.PORT || 3000);
