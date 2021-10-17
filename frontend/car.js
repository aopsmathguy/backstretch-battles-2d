var gravity = 10;
var Car = class {
  id;
  cfg;
  body;
  gas;
  brake;
  eBrake;
  steerAngle;
  netWheelForce;
  //required id
  constructor(opts){
    opts = opts || {};
    this.id = opts.id;
    this.cfg = new Car.Config(opts.cfg);
    if (opts.body != undefined){
      this.body = Physics.Body.generateBody(opts.body);
    } else{
      this.body = new Physics.PolyBody({points : this.cfg.points, mass : this.cfg.mass, inertia : this.cfg.mass * this.cfg.inertiaScale, kFriction : 0.14, sFriction : 0.2, elasticity : 0.2});
    }
    this.gas = (opts.gas != undefined ? opts.gas : 0);
    this.brake = (opts.brake != undefined ? opts.brake : 0);
    this.eBrake = (opts.eBrake != undefined ? opts.eBrake : false);
    this.steerAngle = (opts.steerAngle != undefined ? opts.steerAngle : 0);
    this.safeSteer = (opts.safeSteer != undefined ? opts.safeSteer : true);
    this.netWheelForce = Vector.copy(opts.netWheelForce);
  }
  updateInputs(controls, dt){
    var cfg = this.cfg;
    var body = this.body;

    var gasTarget;
    if (controls.keys["ArrowUp"]){
      gasTarget = 1;
    } else{
      gasTarget = 0;
    }
    this.gas += (gasTarget - this.gas) * 5 * dt;

    var brakeTarget;
    if (controls.keys["ArrowDown"]){
      brakeTarget = 1;
    } else{
      brakeTarget = 0;
    }
    this.brake += (brakeTarget - this.brake) * 5 * dt;
    this.eBrake = controls.keys[" "];

    var maxSteer = cfg.maxSteer * (this.safeSteer ? MyMath.clamp(
      1 - Math.min(body.velocity.magnitude(),85)/100
      , -1, 1): 1);
    var turnRate = 120*Math.PI/180;
    var steerTarget;
    if (controls.keys["ArrowLeft"]){
      steerTarget = -maxSteer;
    } else if (controls.keys["ArrowRight"]){
      steerTarget = maxSteer;
    }
    else{
      steerTarget = 0;
    }
    this.steerAngle += (steerTarget - this.steerAngle) * turnRate * dt;
  }
  displayWheels(ctx, dt){
    dt = dt || 0;
    var cfg = this.cfg;
    var body = this.body;
    ctx.save();
    var s = body.lerpedState(dt);
    ctx.translate(s.position.x,s.position.y);
    ctx.rotate(s.angle);
    ctx.save();
    ctx.translate(cfg.cgToFrontAxle,cfg.halfFrontAxleLength);
    ctx.rotate(this.steerAngle);
    ctx.beginPath();
    ctx.moveTo(0.3,0.1);
    ctx.lineTo(0.3,-0.1);
    ctx.lineTo(-0.3,-0.1);
    ctx.lineTo(-0.3,0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(cfg.cgToFrontAxle,-cfg.halfFrontAxleLength);
    ctx.rotate(this.steerAngle);
    ctx.beginPath();
    ctx.moveTo(0.3,0.1);
    ctx.lineTo(0.3,-0.1);
    ctx.lineTo(-0.3,-0.1);
    ctx.lineTo(-0.3,0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(-cfg.cgToBackAxle,cfg.halfBackAxleLength);
    ctx.beginPath();
    ctx.moveTo(0.3,0.1);
    ctx.lineTo(0.3,-0.1);
    ctx.lineTo(-0.3,-0.1);
    ctx.lineTo(-0.3,0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(-cfg.cgToBackAxle,-cfg.halfBackAxleLength);
    ctx.beginPath();
    ctx.moveTo(0.3,0.1);
    ctx.lineTo(0.3,-0.1);
    ctx.lineTo(-0.3,-0.1);
    ctx.lineTo(-0.3,0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
  displayBody(ctx, dt){
    dt = dt || 0;
    var cfg = this.cfg;
    var body = this.body;
    ctx.save();
    var s = body.lerpedState(dt);
    ctx.translate(s.position.x,s.position.y);
    ctx.rotate(s.angle);

    ctx.beginPath();
    for (var i = 0; i < body.points.length; i++){
      var point = body.points[i];
      if (i == 0){
        ctx.moveTo(point.x, point.y);
      }
      else{
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  displayDirection(ctx, dt){
    var cfg = this.cfg;
    var body = this.body;
    ctx.save();
    var s = body.lerpedState(dt);
    ctx.translate(s.position.x,s.position.y);
    ctx.rotate(s.angle);
    var length = 6;
    ctx.setLineDash([0.5, 0.5]);
    if (Math.abs(this.steerAngle) < 0.001){
      ctx.beginPath();
      ctx.moveTo(cfg.cgToFrontAxle,cfg.halfFrontAxleLength);
      ctx.lineTo(cfg.cgToFrontAxle+length,cfg.halfFrontAxleLength);
      ctx.moveTo(cfg.cgToFrontAxle,-cfg.halfFrontAxleLength);
      ctx.lineTo(cfg.cgToFrontAxle+length,-cfg.halfFrontAxleLength);
      ctx.stroke();
    } else if (this.steerAngle > 0){
      ctx.beginPath();
      var l = cfg.cgToFrontAxle + cfg.cgToBackAxle;
      var r = l/Math.sin(this.steerAngle);
      ctx.arc(-cfg.cgToBackAxle, l/Math.tan(this.steerAngle), r + cfg.halfFrontAxleLength, this.steerAngle - Math.PI/2, this.steerAngle - Math.PI/2 + length/r);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-cfg.cgToBackAxle, l/Math.tan(this.steerAngle), r - cfg.halfFrontAxleLength, this.steerAngle - Math.PI/2, this.steerAngle - Math.PI/2 + length/r);
      ctx.stroke();
    } else{
      ctx.beginPath();
      var l = cfg.cgToFrontAxle + cfg.cgToBackAxle;
      var r = -l/Math.sin(this.steerAngle);
      ctx.arc(-cfg.cgToBackAxle, l/Math.tan(this.steerAngle), r + cfg.halfFrontAxleLength, this.steerAngle + Math.PI/2, this.steerAngle + Math.PI/2 - length/r, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-cfg.cgToBackAxle, l/Math.tan(this.steerAngle), r - cfg.halfFrontAxleLength, this.steerAngle + Math.PI/2, this.steerAngle + Math.PI/2 - length/r, true);
      ctx.stroke();
    }
    ctx.restore();
  }
  step(dt, f){
    f = (f == undefined ? 1 : f);
    var cfg = this.cfg;
    var body = this.body;

    var carDir = (new Vector(1,0)).rotate(body.angle);


//     if (!this.netWheelForce.x || !this.netWheelForce.y){
//       this.netWheelForce = new Vector(0,0);
//     }
    var wFAlongCar = this.netWheelForce.dot(carDir);
    var l = cfg.cgToFrontAxle + cfg.cgToBackAxle;
    var fwWeight = -wFAlongCar * cfg.cgHeight/l + body.mass * gravity * cfg.cgToBackAxle/l;
    var bwWeight = wFAlongCar * cfg.cgHeight/l + body.mass * gravity * cfg.cgToFrontAxle/l;
    var fwR = carDir.multiplyV(new Vector(cfg.cgToFrontAxle, 0));
    var bwR = (new Vector(-cfg.cgToBackAxle, 0)).multiplyV(carDir);
    var fwV = body.getVelocity(fwR);
    var bwV = body.getVelocity(bwR);

    var tireGripFront = cfg.maxTireGripFront;
    var tireGripRear = cfg.maxTireGripBack * (1.0 - (this.eBrake ? 0 : 1) * (1.0 - cfg.lockGrip)); //

    var fwDir = body.angle + this.steerAngle;
    var fwSlipAng = fwV.ang() - fwDir;
    var fwForce = new Vector(0, fwWeight * MyMath.clamp(-cfg.cornerStiffnessFront * Math.sin(fwSlipAng), -tireGripFront, tireGripFront)).rotate(fwDir);

    var bwDir = body.angle;
    var bwSlipAng = bwV.ang() - bwDir;
    var bwForce = new Vector(0, bwWeight * MyMath.clamp(-cfg.cornerStiffnessBack * Math.sin(bwSlipAng), -tireGripRear, tireGripRear)).rotate(bwDir);
    var engineForce;

    var rpm = Math.abs(carDir.dot(body.velocity));
    if (rpm < 20){
      rpm = 20;
    }
    engineForce = carDir.multiply(
      this.gas * cfg.enginePower/Math.abs(rpm)
      - this.brake * (carDir.dot(body.velocity) > 0 ? cfg.brakeForce : cfg.enginePower/Math.abs(rpm))
      - MyMath.sign(carDir.dot(body.velocity)) * (this.eBrake ? cfg.ebrakeForce : 0)
    );
    var dragForce = body.velocity.multiply(-cfg.dragCoefficient * f * body.velocity.magnitude());
    var rollForce = carDir.multiply(-body.velocity.dot(carDir) * cfg.rollingResistance);
    body.applyImpulse(engineForce.multiply(dt));
    body.applyImpulse(dragForce.multiply(dt));
    body.applyImpulse(rollForce.multiply(dt));

    body.applyImpulse(fwForce.multiply(dt), fwR);
    body.applyImpulse(bwForce.multiply(dt), bwR);
    this.netWheelForce = engineForce.add(rollForce).add(fwForce).add(bwForce);
  }
  createStats(){
    return new Car.Stats(this);
  }
}
Car.Config = class{
  points;
  mass;
  inertiaScale;

  maxSteer;
  halfFrontAxleLength;
  halfBackAxleLength;

  cgToFrontAxle;
  cgToBackAxle;
  cgHeight;
  maxTireGripFront;
  maxTireGripBack;
  engineForce;
  brakeForce;
  dragCoefficient;
  draftPoints;
  rollingResistance;
  constructor(opts){
    opts = opts || {};
    this.points = opts.points || [
      new Vector(2.2,0),
      new Vector(2.16,-0.33),
      new Vector(2.03,-0.57),
      new Vector(1.85,-0.72),
      new Vector(1.63,-0.8),
      new Vector(-1.45,-0.8),
      new Vector(-1.81,-0.76),
      new Vector(-2.03,-0.72),
      new Vector(-2.18,-0.5),
      new Vector(-2.2,0),
      new Vector(-2.18,0.5),
      new Vector(-2.03,0.72),
      new Vector(-1.81,0.76),
      new Vector(-1.45,0.8),
      new Vector(1.63,0.8),
      new Vector(1.85,0.72),
      new Vector(2.03,0.57),
      new Vector(2.16,0.33)
    ];
    this.mass = opts.mass || 1200;//kg
    this.inertiaScale = opts.inertiaScale || 1.5;

    this.maxSteer = opts.maxSteer || 0.5;
    this.halfFrontAxleLength = opts.halfFrontAxleLength || 0.8;
    this.halfBackAxleLength = opts.halfBackAxleLength || 0.8;

    this.cgToFrontAxle = opts.cgToFrontAxle || 1.2;//m
    this.cgToBackAxle = opts.cgToBackAxle || 1.3;//m
    this.cgHeight = opts.cgHeight || 0.5;//m
    this.maxTireGripFront = opts.maxTireGripFront || 2;//
    this.maxTireGripBack = opts.maxTireGripBack || 2.5;//
    this.lockGrip = opts.lockGrip || 0.7;//

    this.cornerStiffnessFront = opts.cornerStiffnessFront || 4;
    this.cornerStiffnessBack = opts.cornerStiffnessBack || 5;
    this.enginePower = opts.enginePower || 500000;// watts

    this.brakeForce = opts.brakeForce || 12000;// newtons
    this.ebrakeForce = opts.ebrakeForce || this.brakeForce / 2.5;

    this.dragCoefficient = opts.dragCoefficient || 0.8;
    if (this.draftPoints != undefined){
      this.draftPoints = [];
      for (var i = 0; i < opts.draftPoints.length; i++){
        this.draftPoints[i] = Vector.copy(opts.draftPoints[i]);
      }
    } else{
      this.draftPoints = [
        new Vector(0,-0.5),
        new Vector(0,0.5),
        new Vector(0,0)
      ];
    }
    this.rollingResistance = opts.rollingResistance || 12.8;
  }
}
Car.Stats = class{
  speed;
  throttle;
  steerAngle;
  brake;
  eBrake;
  constructor(car){
    this.speed = car.body.velocity.magnitude();
    this.throttle = car.gas;
    this.brake = car.brake;
    this.eBrake = car.eBrake;
    this.steerAngle = car.steerAngle;
  }
  displaySpeed(){
    var radius = 75;
    var mphPerMps = 2.23694;
    var maxSpeed = 200;//mph
    var minAngle = -5*Math.PI/4;
    var maxAngle = Math.PI/4;
    var fraction = this.speed * mphPerMps/maxSpeed;
    var angle = maxAngle * fraction + minAngle * (1 - fraction);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.5*radius, 0);
    ctx.stroke();
    ctx.restore();
  }
  displaySteeringWheel(ctx){
    var radius = 50;
    var steerRatio = 12;
    ctx.save();
    ctx.rotate(this.steerAngle * steerRatio);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.moveTo(radius, 0);
    ctx.lineTo(-radius, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, radius);
    ctx.stroke();
    ctx.restore();
  }
}
Car.World = class {
  cars;
  count;
  pWorld;
  constructor(){
    this.cars = {};
    this.count = 0;
    this.pWorld = new Car.ParticleWorld();
  }
  getCar(id){
    return this.cars[id];
  }
  addCar(opts){
    var id = opts.id;
    if (!this.cars[id]){
      this.count ++;
    }
    this.cars[id] = new Car(opts);
  }
  removeCar(id){
    if (this.cars[id]){
      this.count --;
    }
    delete this.cars[id]
  }
  addCarParticles(){
    var out = [];
    for (var i in this.cars){
      var c = this.cars[i];
      var cfg = c.cfg;
      var mag = c.body.velocity.magnitude()**2/10000;
      for (var j = 0; j < cfg.draftPoints.length; j++){
        var pos = c.body.position.add(cfg.draftPoints[j].rotate(c.body.angle));
        var idx = this.pWorld.addParticle(new Car.Particle({ownerId : c.id, position : pos, strength : mag}));
        out.push(idx);
      }
    }
    return out;
  }
  step(dt){
    for (var i in this.cars){
      var c = this.cars[i];
      var f = this.pWorld.calculateCarDragFactor(c);
      c.step(dt, f);
    }
    this.pWorld.step(dt);
  }
}
Car.Particle = class {
  position;
  strength;
  decayTime;
  ownerId;
  //required id
  constructor(opts){
    opts = opts || {};
    this.position = Vector.copy(opts.position);
    this.strength = opts.strength || 0;
    this.decayTime = opts.decayTime || 5;
    this.ownerId = opts.ownerId || 0;
  }
  display(ctx){
    ctx.save();
    ctx.globalAlpha = this.strength;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 0.3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  step(dt){
    this.strength *= 1 - dt/this.decayTime;
    if (this.strength < 0.01){
      return false;
    }
    return true;
  }
}
Car.ParticleWorld = class {
  particles;
  addIdx;
  pHashGrid;
  gridSize = 3;
  constructor(){
    this.particles = {};
    this.addIdx = 0;
    this.pHashGrid = new HashGrid();
  }
  displayRect(ctx, min, max){
    var minGrid = this.getGrid(min);
    var maxGrid = this.getGrid(max);
    var idxSet = new Set();
    for (var xGrid = minGrid.x - 1; xGrid <= maxGrid.x + 1; xGrid++){
      for (var yGrid = minGrid.y - 1; yGrid <= maxGrid.y + 1; yGrid++){
        var list = this.pHashGrid.get(xGrid,yGrid);
        if (list == undefined){
          continue;
        }
        list.forEach((item) => {
          idxSet.add(item);
        });
      }
    }
    idxSet.forEach((i) =>{
      if (this.particles[i]){
        this.particles[i].display(ctx);
      }
    });
  }
  calculateCarDragFactor(c){
    var f = 1;
    var s = c.body.generateShape();
    var min = this.getGrid(s.min);
    var max = this.getGrid(s.max);
    var check = new Set();
    for (var xGrid = min.x; xGrid <= max.x; xGrid++){
      for (var yGrid = min.y; yGrid <= max.y; yGrid++){
        var set = this.pHashGrid.get(xGrid, yGrid);
        if (set == undefined){
          continue;
        }
        set.forEach((idx) => {
          check.add(idx);
        });
      }
    }
    check.forEach((item, i) => {
      var p = this.particles[item];
      if (p && p.ownerId != c.id && s.containsPoint(p.position)){
        f *= 1 - p.strength;
      }
    });
    return f;
  }
  getGrid(v){
    return v.multiply(1/this.gridSize).floor();
  }
  getIdxSet(p){
    var addTo = this.getGrid(p.position);
    return this.pHashGrid.get(addTo.x, addTo.y);
  }
  addParticle(p){
    var idx = this.addIdx++;
    this.particles[idx] = p;
    var addTo = this.getGrid(p.position);
    this.pHashGrid.add(addTo.x, addTo.y, idx);
    return idx;
  }
  removeParticle(i){
    i = parseInt(i);
    var p = this.particles[i];
    if (p == undefined){
      return 0;
    }
    var addTo = this.getGrid(p.position);
    var success = this.pHashGrid.remove(addTo.x, addTo.y, i);
    delete this.particles[i];
    return success;
  }
  step(dt){
    for (var i in this.particles){
      if (!this.particles[i].step(dt)){
        this.removeParticle(i);
      }
    }
  }
}
Car.BarrierWorld = class{
  bodies;
  enabled;
  constructor(opts){
    this.bodies = [];
    if (this.bodies != undefined){
      for (var i = 0; i < opts.bodies.length; i++){
        var body = Physics.Body.generateBody(opts.bodies[i]);
        this.bodies[i] = body;
      }
    }
    this.enabled = opts.enabled || false;
  }
  enable(world){
    for (var i = 0; i < this.bodies.length; i++){
      var body = this.bodies[i];
      world.addBody(body);
    }
    this.enabled = true;
  }
  disable(world){
    for (var i = 0; i < this.bodies.length; i++){
      var body = this.bodies[i];
      world.removeBody(body);
    }
    this.enabled = false;
  }
}
Car.FinishLine = class{
  body;
  constructor(opts){
    this.body = Physics.Body.generateBody(opts.body);
  }
  display(ctx){
    this.body.display(ctx);
  }
  checkCar(car){
    var cb = car.body.generateShape();
    var s = this.body.generateShape();
    var cbToS = cb.findAxisOfLeastPen(s);
    var sToCb = s.findAxisOfLeastPen(cb);
    if (Math.max(cbToS.penetration, sToCb.penetration) < 0){
      return true;
    }
    return false;
  }
  checkCWorld(carWorld){
    for (var i in carWorld.cars){
      var car = carWorld.getCar(i);
      if (this.checkCar(car)){
        return i;
      }
    }
    return -1;
  }
}
