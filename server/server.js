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
    if (controls[client.id] || carWorld.getCar(client.id)){
      return;
    }
    controls[client.id] = new UserControls();
    carWorld.addCar({id : client.id});
    carWorld.getCar(client.id).body.position = startPosition;
    world.addBody(carWorld.getCar(client.id).body);
    client.emit('startState', {
      id : client.id,
      staticBodies : staticBodies,
      controls : controls,
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
var startPosition;
var world;
var startBarriers;
var finishLine;
var state;//"wait", "countdown", "started", "ended"
var timer;
var COUNT_TIME = 10000;
var END_TIME = 10000;
var dt = .008;
var draftPeriod = 3;
var d = 0;
var emitPeriod = 20;
var e = 0;

function startGame(){
  carWorld = new Car.World();
  newParticlesIdx = [];
  createObstacles();
  state = "wait";
  timer = 0;
  setInterval(step, 1000*dt);
}
function shape(x){
    return 0;
}
function createTrack(vs, width1, width2){
  function calculateDisplacement(n1, n2){
    if (n1.cross(n2) == 0){
      return n1;
    }
    return n2.subtract(n1).rCrossZ(1/(n1.cross(n2)));
  }
  var out = [];
  for (var i = 0; i < vs.length; i++){
    var v1 = vs[i];
    var v2 = vs[(i+1) % vs.length];
    var v3 = vs[(i+2) % vs.length];
    var v4 = vs[(i+3) % vs.length];
    var n0 = v1.subtract(v2).rCrossZ(1).normalize();
    var n1 = v2.subtract(v3).rCrossZ(1).normalize();
    var n2 = v3.subtract(v4).rCrossZ(1).normalize();
    var dx1 = calculateDisplacement(n0, n1);
    var dx2 = calculateDisplacement(n1, n2);
    out.push(new Physics.PolyBody({
      points : [
        v3.add(dx2.multiply(width2/2)),
        v3.add(dx2.multiply(width1/2)),
        v2.add(dx1.multiply(width1/2)),
        v2.add(dx1.multiply(width2/2))
      ], mass : Infinity, inertia: Infinity, kFriction : 0.3, sFriction : 0.4, elasticity : 0.4, position : new Vector(0, 0)
    }));
    out.push(new Physics.PolyBody({
      points : [
        v3.add(dx2.multiply(-width1/2)),
        v3.add(dx2.multiply(-width2/2)),
        v2.add(dx1.multiply(-width2/2)),
        v2.add(dx1.multiply(-width1/2))
      ], mass : Infinity, inertia: Infinity, kFriction : 0.3, sFriction : 0.4, elasticity : 0.4, position : new Vector(0, 0)
    }));
  }
  return out;
}
function createObstacles(){
  var spacings = 20;
  var length = 2000;
  var radius = 500;
  var width = 20;
  var track = [];
  for (var i = 0; i < length/spacings; i++){
    var x = i * spacings;
    track.push(new Vector(length - x, radius));
  }
  var center = new Vector(length, 0);
  var radiusV = new Vector(radius,0);
  for (var i = 0; i < radius* Math.PI/spacings; i++){
    var angle = -i * spacings/radius + Math.PI/2;
    track.push(center.add(radiusV.rotate(angle)));
  }
  for (var i = 0; i < length/spacings; i++){
    var x = i * spacings;
    track.push(new Vector(x, -radius));
  }
  center = new Vector(0, 0);
  radiusV = new Vector(radius,0);
  for (var i = 0; i < radius* Math.PI/spacings; i++){
    var angle = -i * spacings/radius - Math.PI/2;
    track.push(center.add(radiusV.rotate(angle)));
  }

  staticBodies = createTrack(track, 20,22);
  startPosition = new Vector(0, radius);
  startBarriers = new Car.BarrierWorld({
    bodies : [
      new Physics.RectBody({
        length: 1, width : 60, mass : Infinity, kFriction : 0.3, sFriction : 0.4, elasticity : 0.4, position : track[1]
      })
    ]
  });
  finishLine = new Car.FinishLine({body : new Physics.RectBody({
    length: 1, width : 60, mass : Infinity, kFriction : 0.3, sFriction : 0.4, elasticity : 0.4, position : track[track.length - 2]
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
    body.position = startPosition;
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
  io.sockets.emit('gameState', {time : Date.now(), controls : controls, cars : generatePState(), newParticles : getNewParticles(), d : d});
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
