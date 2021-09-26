var TwoWayMap = class{
    constructor() {
       this.map = new Map();
       this.reverseMap = new Map();
    }
    getValue(key) { return this.map.get(key); }
    getKey(v) { return this.reverseMap.get(v); }
    add(k, v){
      this.map.set(k, v);
      this.reverseMap.set(v, k);
    }
    removeKey(k){
      var v = this.getValue(k);
      this.map.delete(k);
      this.reverseMap.delete(v);
      return v;
    }
    removeValue(v){
      var k = this.getKey(v);
      this.reverseMap.delete(v);
      this.map.delete(k);
      return k;
    }
    forEach(func){
      this.map.forEach(func);
    }
}
var HashGrid = class{
  obj;
  constructor(){
    this.obj = {};
  }
  key(x, y){
    return x + " " + y;
  }
  clear(){
    this.obj = {};
  }
  add(x, y, elem){
    var hash = this.key(x,y);
    if (!this.obj[hash]){
      this.obj[hash] = new Set();
    }
    this.obj[hash].add(elem);
  }
  remove(x, y, elem){
    var hash = this.key(x,y);
    if (!this.obj[hash]){
      return;
    }
    this.obj[hash].delete(elem);
  }
  get(x,y){
    var hash = this.key(x,y);
    return this.obj[hash];
  }
}
var Physics = {};
Physics.World = class{
  scale = 20;
  gridSize = 10;

  staticBodies;
  staticIdx;

  dynamicBodies;
  dynamicIdx;

  staticBodiesRegions;
  dynamicBodiesRegions;
  constructor(){
    this.staticBodies = new TwoWayMap();
    this.staticIdx = 0;

    this.dynamicBodies = new TwoWayMap();
    this.dynamicIdx = 0;

    this.staticBodiesRegions = new HashGrid();
    this.dynamicBodiesRegions = new HashGrid();
  }
  dimensionsInMeters(){
    return (new Vector(innerWidth, innerHeight)).multiply(1/this.scale);
  }
  transform(ctx, func){
    ctx.save();
    ctx.scale(this.scale,this.scale);
    func();
    ctx.restore();
  }
  displayRect(ctx, min, max, dt){
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "rgba(255,255,255,0)";
    var minGrid = this.getGrid(min);
    var maxGrid = this.getGrid(max);
    var idxSet = new Set();
    for (var xGrid = minGrid.x - 1; xGrid <= maxGrid.x + 1; xGrid++){
      for (var yGrid = minGrid.y - 1; yGrid <= maxGrid.y + 1; yGrid++){
        var list = this.staticBodiesRegions.get(xGrid,yGrid);
        if (list == undefined){
          continue;
        }
        list.forEach((item) => {
          idxSet.add(item);
        });
      }
    }
    idxSet.forEach((i) =>{
      this.staticBodies.getValue(i).display(ctx, dt);
    });
    this.updateDynamicHashGrid();
    for (var xGrid = minGrid.x - 1; xGrid <= maxGrid.x + 1; xGrid++){
      for (var yGrid = minGrid.y - 1; yGrid <= maxGrid.y + 1; yGrid++){
        var list = this.dynamicBodiesRegions.get(xGrid,yGrid);
        if (list == undefined){
          continue;
        }
        list.forEach((item) => {
          this.dynamicBodies.getValue(item).display(ctx, dt);
        });
      }
    }
  }
  display(ctx, dt){
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "rgba(255,255,255,0)";
    this.staticBodies.forEach((body, i) => {
      body.display(ctx, dt);
    });
    this.dynamicBodies.forEach((body, i) => {
      body.display(ctx, dt);
    });
  }
  solvePosition(A,B,rA,rB, n, dlength){
    var normCombinedInvMass = 1/A.mass + 1/B.mass + n.cross(rA)**2/A.inertia + n.cross(rB)**2/B.inertia;
    var massMove = (dlength)/normCombinedInvMass;
    A.applyMassDisplacement(n.multiply(massMove), rA);
    B.applyMassDisplacement(n.multiply(-massMove), rB);
    return massMove;
  }
  solveVelocity(A,B,rA,rB, n, dvel){
    var normCombinedInvMass = 1/A.mass + 1/B.mass + n.cross(rA)**2/A.inertia + n.cross(rB)**2/B.inertia;
    var inertia = (dvel)/normCombinedInvMass;
    return inertia;
  }
  applyImpulses(A,B, rA, rB, imp){
    A.applyImpulse(imp, rA);
    B.applyImpulse(imp.multiply(-1), rB);
  }
  intersect(A, B){
    var slop = 0.03;
    var percent = 1;

    var APoly = A.generateShape();
    var BPoly = B.generateShape();

    var AEdge = APoly.findAxisOfLeastPen(BPoly);
    var BEdge = BPoly.findAxisOfLeastPen(APoly);
    var edgeBody;
    var vertBody;
    var intersectInfo;
    if (AEdge.penetration > BEdge.penetration){
      edgeBody = A;
      vertBody = B;
      intersectInfo = AEdge;
    }
    else{
      edgeBody = B;
      vertBody = A;
      intersectInfo = BEdge;
    }
    var normal = intersectInfo.normal;
    var penetration = intersectInfo.penetration;
    if (penetration > -slop){
      return false;
    }
    var vertex = intersectInfo.vertex;
    var edge = intersectInfo.vertex.add(normal.multiply(-penetration));

    var rEdge = edge.subtract(edgeBody.position);
    var rVert = vertex.subtract(vertBody.position);

    this.solvePosition(edgeBody,vertBody,rEdge,rVert,normal, penetration);


    var vEdge = edgeBody.getVelocity(rEdge);
    var vVert = vertBody.getVelocity(rVert);

    var rel = vEdge.subtract(vVert);
    var normRel = normal.dot(rel);
    if (normRel < 0){
      return true;
    }
//     var p1 = edgeBody.position.add(rEdge);
//     var p2 = vertBody.position.add(rVert);

    // debugLine(edgeBody.position, p1);
    // debugLine(vertBody.position, p2);
    // debugDot(p1);
    // debugDot(p2);

    var elasticity = Physics.combinedElasticity(edgeBody.elasticity, vertBody.elasticity);
    var dvel = -(1 + elasticity) * normRel;

    var imp = this.solveVelocity(edgeBody,vertBody,rEdge,rVert,normal, dvel);
    this.applyImpulses(edgeBody, vertBody, rEdge, rVert, normal.multiply(imp));

    var tangent = rel.subtract(normal.multiply(rel.dot(normal))).normalize();
    var relVelAlongTangent =  tangent.dot(rel);
    var mu = Physics.combinedFrictionCoef(edgeBody.sFriction, vertBody.sFriction)
    var fricImp;
    var tImp = this.solveVelocity(edgeBody,vertBody,rEdge,rVert,tangent, -relVelAlongTangent);
    if (Math.abs(tImp) > - imp * mu){
      var dmu = Physics.combinedFrictionCoef(edgeBody.kFriction, vertBody.kFriction);
      tImp = imp * dmu;
    }
    this.applyImpulses(edgeBody, vertBody, rEdge, rVert, tangent.multiply(tImp));
    return true;
  }
  updateDynamicHashGrid(){
    this.dynamicBodiesRegions.clear();
    this.dynamicBodies.forEach((body, idx) => {
      var center = this.getGrid(body.position);
      this.dynamicBodiesRegions.add(center.x, center.y, idx);
    });
  }
  getGrid(pos){
    return pos.multiply(1/this.gridSize).floor();
  }
  addBody(b){
    if (b.mass == Infinity){
      var idx = this.staticIdx++;
      this.staticBodies.add(idx, b);
      var poly = b.generateShape();
      var minG = this.getGrid(poly.min);
      var maxG = this.getGrid(poly.max);
      for (var x = minG.x - 1; x <= maxG.x + 1; x++){
        for (var y = minG.y - 1; y <= maxG.y + 1; y++){
          this.staticBodiesRegions.add(x, y, idx);
        }
      }
    }
    else{
      this.dynamicBodies.add(this.dynamicIdx++, b);
    }
  }
  removeBody(b){
    if (b.mass == Infinity){
      var idx = this.staticBodies.removeValue(b);
      var poly = b.generateShape();
      var minG = this.getGrid(poly.min);
      var maxG = this.getGrid(poly.max);
      for (var x = minG.x - 2; x <= maxG.x + 2; x++){
        for (var y = minG.y - 2; y <= maxG.y + 2; y++){
          this.staticBodiesRegions.remove(x, y, idx);
        }
      }
    }
    else{
      this.dynamicBodies.removeValue(b);
    }
  }
  getDynamicIntersects(body){
    var grid = this.getGrid(body.position);
    var s = new Set();
    for (var x = grid.x - 1; x <= grid.x + 1; x++){
      for (var y = grid.y - 1; y <= grid.y + 1; y++){
        var toAdd = this.dynamicBodiesRegions.get(x, y);
        if (toAdd == undefined){
          continue;
        }
        toAdd.forEach((item) => {
          s.add(item);
        });
      }
    }
    return Array.from(s);
  }
  getStaticIntersects(body){
    var grid = this.getGrid(body.position);
    return this.staticBodiesRegions.get(grid.x, grid.y);
  }
  step(t){
    this.dynamicBodies.forEach((body, i) => {
      body.integrate(t);
    });

    var moved = new Set();
    this.updateDynamicHashGrid();
    this.dynamicBodies.forEach((body, i) => {
      moved.add(i);
    });
    var count = 0;
    while(moved.size > 0){
    // for (var k = 0; k < 1; k++){
      var newMoved = new Set();
      moved.forEach((i) => {
        var body = this.dynamicBodies.getValue(i);
        var dynamicInt = this.getDynamicIntersects(body);
        for (var j in dynamicInt){
          var idx = dynamicInt[j];
          if (i == idx){
            continue;
          }
          var oBody = this.dynamicBodies.getValue(idx);
          var m = this.intersect(body, oBody);
          if (m){
            newMoved.add(i);
            newMoved.add(idx);
          }
        }
        var staticInt = this.getStaticIntersects(body);
        if (staticInt == undefined){
          return;
        }
        staticInt.forEach((j) => {
          var oBody = this.staticBodies.getValue(j);
          var m = this.intersect(body, oBody);
          if (m){
            newMoved.add(i);
          }
        });

      });
      moved = newMoved;
      count++;
    }
  }
}
Physics.Body = class{
  mass;
  inertia;
  kFriction;
  sFriction;
  elasticity;

  position;
  _velocity;
  velocity;

  angle;
  _angleVelocity;
  angleVelocity;
  constructor(opts){
    opts = opts || {};
    this.mass = opts.mass || Infinity;
    this.inertia = opts.inertia || Infinity;
    this.kFriction = opts.kFriction || 0.1;
    this.sFriction = opts.sFriction || 0.2;
    this.elasticity = opts.elasticity || 0.3;

    this.position = Vector.copy(opts.position) || new Vector(0,0);
    this.velocity = Vector.copy(opts.velocity) || new Vector(0,0);
    this._velocity = this.velocity;

    this.angle = opts.angle || 0;
    this.angleVelocity =  opts.angleVelocity || 0;
    this._angleVelocity = this.angleVelocity;
  }
  static generateBody(opts){
    if (opts.bodyType == "c"){
      return new Physics.CircleBody(opts);
    }
    else if (opts.bodyType == "p"){
      return new Physics.PolyBody(opts);
    }
  }
  lerpedState(dt){
    var state = {};
    state.position = this.position.lerp(this.velocity, dt);
    state.angle = MyMath.lerp(this.angle, this.angleVelocity, dt);
    return state;
  }
  getVelocity(r){
    return this.velocity.add(r.rCrossZ(this.angleVelocity));
  }
  applyImpulse(imp, r){
    r = r || new Vector(0,0);
    this.velocity = this.velocity.add(imp.multiply(1 / this.mass));
    this.angleVelocity += 1/this.inertia * r.cross(imp);
  }
  applyMassDisplacement(massLength, r){
    this.position = this.position.add(massLength.multiply(1 / this.mass));
    this.angle += 1/this.inertia * r.cross(massLength);
  }
  integrate(t){
    this.position = this.position.add(this.velocity.multiply(t));
    this.angle += (this.angleVelocity)* t;
    this._velocity = this.velocity;
    this._angleVelocity = this.angleVelocity;
  }
};
Physics.Circle = class{
  sType = "c";
  center;
  radius;
  min;
  max;
  constructor(center, radius){
    this.center = center;
    this.radius = radius;
    this.min = center.add(new Vector(- this.radius, - this.radius));
    this.max = center.add(new Vector(this.radius, this.radius));
  }
  display(ctx){
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  extremePoint(dir){
    return this.center.add(dir.multiply(this.radius));
  }
  findAxisOfLeastPen(b){
    switch (b.sType){
      case "c":
        var centerDisp = b.center.subtract(this.center);
        var normal = centerDisp.normalize();
        var bestDistance = centerDisp.magnitude() - (b.radius + this.radius);
        var vertex = b.extremePoint(normal.multiply(-1));
        return {normal : normal, penetration : bestDistance, vertex : vertex};
        break;
      //circle vs polygon vertex
      case "p":
        var closestDist = 10000000;
        var vertexIdx;
        for (var i = 0; i < b.vs.length; i++){
          var v = b.vs[i];
          var dist = this.center.distanceTo(v);
          if (dist < closestDist){
            closestDist = dist;
            vertexIdx = i;
          }
        }
        var now = b.vs[vertexIdx];
        var next = b.vs[(vertexIdx + 1) % b.vs.length];
        var prev = b.vs[(vertexIdx - 1 + b.vs.length) % b.vs.length];
        var toNext = next.subtract(now);
        var toPrev = prev.subtract(now);
        var toCenter = this.center.subtract(now);
        var normal = toCenter.multiply(-1).normalize();
        var bestDistance = -normal.dot(toCenter) - this.radius;
        if (toCenter.dot(toNext) > 0 || toCenter.dot(toPrev) > 0){
          bestDistance = -10000000;
        }
        return {normal : normal, penetration : bestDistance, vertex : now};
        break;
    }
  }
};
Physics.Polygon = class {
  sType = "p";
  vs;
  min;
  max;
  constructor(vs){
    this.vs = vs;
    this.min = new Vector(10000000,10000000);
    this.max = new Vector(-10000000,-10000000);
    for (var i = 0; i < this.vs.length; i++){
      var point = this.vs[i];
      this.min.x = Math.min(this.min.x, point.x);
      this.min.y = Math.min(this.min.y, point.y);
      this.max.x = Math.max(this.max.x, point.x);
      this.max.y = Math.max(this.max.y, point.y);
    }
  }
  display(ctx){
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < this.vs.length; i++){
      var point = this.vs[i];
      if (i == 0){
        ctx.moveTo(point.x, point.y);
      }
      else{
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  extremePoint(dir){
    var bestProj = - 100000000;
    var out;
    for (var i = 0; i < this.vs.length; i++)
    {
        var v = this.vs[i];
        var proj = v.dot(dir);
        if (proj > bestProj){
          out = v;
          bestProj = proj;
        }
    }
    return out;
  }
  findAxisOfLeastPen(b){
    switch (b.sType){
      //polygon edge vs circle
      case "c":
        var bestDistance = -100000000;
        var normal;
        var vertex;
        for (var i = 0; i < this.vs.length; i++){
          var from = this.vs[i];
          var to = this.vs[(i + 1) % this.vs.length];
          var n = from.normal(to);
          var s = b.extremePoint(n.multiply(-1));
          var v = this.vs[i];
          var d = n.dot(s.subtract(v));
          if (d > bestDistance){
            bestDistance = d;
            normal = n;
            vertex = s;
          }
        }
        return {normal : normal, penetration : bestDistance, vertex : vertex};
        break;
      case "p":
        var bestDistance = -100000000;
        var normal;
        var vertex;
        for (var i = 0; i < this.vs.length; i++){
          var from = this.vs[i];
          var to = this.vs[(i + 1) % this.vs.length];
          var n = from.normal(to);
          var s = b.extremePoint(n.multiply(-1));
          var v = this.vs[i];
          var d = n.dot(s.subtract(v));
          if (d > bestDistance){
            bestDistance = d;
            normal = n;
            vertex = s;
          }
        }
        return {normal : normal, penetration : bestDistance, vertex : vertex};
        break;
    }
  }
};
Physics.CircleBody = class extends Physics.Body{
  bodyType = "c";
  radius;
  constructor(opts){
    super(opts);
    opts = opts || {};
    this.radius = opts.radius || 1;
  }
  display(ctx, dt){
    dt = dt || 0;
    var s = this.lerpedState(dt);
    ctx.save();
    ctx.translate(s.position.x,s.position.y);
    ctx.rotate(s.angle);

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.moveTo(-this.radius, 0);
    ctx.lineTo(-this.radius/2, 0);
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(this.radius/2, 0);
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(0, -this.radius/2);
    ctx.moveTo(0, this.radius);
    ctx.lineTo(0, this.radius/2);
    ctx.stroke();

    ctx.restore();
  }
  generateShape(){
    var newCenter = this.position;
    return new Physics.Circle(newCenter, this.radius);
  }
};
Physics.PolyBody = class extends Physics.Body{
  bodyType = "p";
  points;
  constructor(opts){
    super(opts);
    opts = opts || {};
    this.points = [];
    if (opts.points == undefined){
      this.points = [
        new Vector(1,1),
        new Vector(1,-1),
        new Vector(-1,-1),
        new Vector(-1,1)
      ];
    }else{
      for (var i = 0; i < opts.points.length; i++){
        this.points[i] = Vector.copy(opts.points[i]);
      }
    }
  }
  display(ctx, dt){
    dt = dt || 0;
    var s = this.lerpedState(dt);
    ctx.save();
    ctx.translate(s.position.x,s.position.y);
    ctx.rotate(s.angle);

    ctx.beginPath();
    for (var i = 0; i < this.points.length; i++){
      var point = this.points[i];
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
  generateShape(){
    var newPoints = [];
    for (var i = 0; i < this.points.length; i++){
      newPoints[i] = this.points[i].rotate(this.angle).add(this.position);
    }
    return new Physics.Polygon(newPoints);
  }
};
Physics.RectBody = class extends Physics.PolyBody{
  constructor(opts){
    super(opts);
    opts = opts || {};
    this.width = opts.width || 2;
    this.length = opts.length || 2;
    this.points = [
      new Vector(this.length/2, this.width/2),
      new Vector(this.length/2, -this.width/2),
      new Vector(-this.length/2, -this.width/2),
      new Vector(-this.length/2, this.width/2)
    ];
    this.inertia = 1/12 * this.mass * (this.length**2 + this.width**2);
  }
};
Physics.combinedElasticity = function(e1, e2){
  return Math.min(e1, e2);
};
Physics.combinedFrictionCoef = function(f1, f2){
  return (f1**2 + f2**2)**0.5;
};
Physics.AABBvsAABB = function(Amin, Amax, Bmin, Bmax){
  var aDim = Amax.subtract(Amin);
  var bDim = Bmax.subtract(Bmin);
  var aCenter = Amax.add(Amin).multiply(0.5);
  var bCenter = Bmax.add(Bmin).multiply(0.5);
  var distCenters = aCenter.subtract(bCenter).abs();
  var dimMean = aDim.add(bDim).multiply(0.5);
  return distCenters.x <= dimMean.x && distCenters.y <= dimMean.y;
};
