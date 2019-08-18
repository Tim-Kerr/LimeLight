//Copyright (c) 2015 Timothy Kerr All Rights Reserved

var wrapper = $("#wrapper");
var body = $("body");
var screenWidth;
var screenHeight;
var centerX;
var centerY;
var mouseX;
var mouseY;
var pMouseX;
var pMouseY;
var mouseMove;
var mouseClickDown = false;
var first = true;
var buffer = [];
var circleWrapper, circ2, circ3, circ4, circ5;
var circleDivHtml = "";
var animating = false;
var screenWidth = document.body.clientWidth;
var screenHeight = document.body.clientHeight;
var fullScreenDiameter = Math.min(screenWidth, screenHeight) * 0.90;//circle diameter 90% of the screen
var fullScreenRadius = fullScreenDiameter / 2;
var MAX_CIRCLE_DIAMETER = 8;

var calCount = 0;

var idCounter = 0;

var finalScale;

//ANIMATION FUNCTIONS
var animationZoom = function(circle, duration, finishedCallback)
{
	animating = true;

	var ratio = circle.width / 100;
	var targetWidth = fullScreenDiameter / (ratio);

	circleWrapper.element.animate({
		width: targetWidth + "px",
		height: targetWidth + "px"
	}, {
		duration: duration,
		easing: "easeOutQuint",
		progress: function(){

			var xi = centerX - circleWrapper.origin.real;
			var yi = centerY - circleWrapper.origin.img;

			var xRatio = xi / circleWrapper.diameter;
			var yRatio = yi / circleWrapper.diameter;

			circleWrapper.diameter = circleWrapper.element.width();
			
			var xf = circleWrapper.diameter * xRatio;
			var yf = circleWrapper.diameter * yRatio;

			deltaX = xf - xi;
			deltaY = yf - yi;

			circleWrapper.origin.real -= deltaX;
			circleWrapper.origin.img -= deltaY;

			circleWrapper.updateTopLeftCSS();
			updateBuffer("zoomOut");
		},
		complete: function(){
			if(typeof(finishedCallback) !== "function"){
				animating = false;
			}
			else{
				finishedCallback(circle, duration);//call the next animation in the sequence if it exists
			}
		}
	});
}

var animationTranslate = function(circle, duration, finishedCallback){
	animating = true;

	var xf = circleWrapper.topLeftX + (centerX - circle.origin().real);
	var yf = circleWrapper.topLeftY + (centerY - circle.origin().img);

	var ratio = circle.width / 100;
	var targetWidth = fullScreenDiameter / (ratio);
 
	circleWrapper.element.animate({
		left: xf + "px",
		top: yf + "px"
	}, {
		duration: duration,
		easing: "easeOutQuint",
		progress: function(){
			circleWrapper.topLeftX = circleWrapper.element.offset().left;
			circleWrapper.topLeftY = circleWrapper.element.offset().top;
			updateBuffer("translate");
		},
		complete: function(){
			if(typeof(finishedCallback) !== "function"){
				animating = false;
			}
			else{
				finishedCallback(circle, duration);
			}
		}
	});
}

function introAnimation(duration)
{
	animating = true;

	circleWrapper.element.animate({
		width: fullScreenDiameter + "px",
		height: fullScreenDiameter + "px"
	}, {
		duration: duration,
		easing: "easeInOutCirc",
		progress: function(){
			circleWrapper.diameter = circleWrapper.element.width();
			circleWrapper.updateTopLeftCSS();
			
			updateBuffer("zoomIn");
		},
		complete: function(){
			animating = false;
		}
	});
}
//END ANIMATION FUNCTIONS

//all calculations are done on a unit circle of diameter 1
//all variables prefaced with an underscore pertain to this unit circle
function CircleWrapper(origin)
{
	var self = this;

	this._origin = new ComplexNumber(1, 1);//private unit origin
	this._radius = 0.5;//private unit radius
	this._diameter = 1;
	this._topLeftX = this._origin.real - this._radius;
	this._topLeftY = this._origin.img - this._radius;

	this.id = "circle-wrapper";
	this.origin = origin;
	this.radius = 0.5;
	this.isOuter = true;
	this.level = 0;

	Object.defineProperties(this, {
		diameter: {
			get: function(){
				return this.radius * 2;
			},
			set: function(value){
				this.radius = value / 2;
			}
		},
		topLeftX: {
			get : function(){
				return this.origin.real - this.radius;
			},
			set: function(value){
				this.origin.real = value + this.radius;
			}
		},
		topLeftY: {
			get : function(){
				return this.origin.img - this.radius;
			},
			set: function(value){
				this.origin.img = value + this.radius;
			}
		},
		topRightX: {
			get: function(){
				return this.origin.real + this.radius;
			}
		},
		topRightY: {
			get: function(){
				return this.origin.img + this.radius;
			}
		}
	});

	this.element = $("<div/>")
						.attr("id", this.id)
						.attr("unselectable", "on")
						.css({"width": this.diameter + "px", 
							"height": this.diameter + "px", 
							"top": this.topLeftY + "px", 
							"left": this.topLeftX + "px",
							"z-index": 0,
							"background-color": '#DDDDDD',
							"display": "block"})
						.addClass("circle");

	wrapper.append(this.element);

	this.updateCSS = function(){
		self.element.css({"width": self.diameter +"px", 
				"height": self.diameter + "px", 
				"top": self.topLeftY +"px",
				"left": self.topLeftX + "px",
				"font-size": self.radius * 0.09 + "px"});
	}

	this.updateTopLeftCSS = function(){
		self.element.css({
				"top": self.topLeftY +"px",
				"left": self.topLeftX + "px"});
	}
}

/**
origin - ComplexNumber object representing the coordinate of the circle
radius - The radius of the circle
tangencyList - Array of Circle objects that are tangent to this circle
parentCircle - Reference to the parent Circle object for this circle
level - The number of levels deep this circle exists on
color - The color of the circle in hex string format (#xxxxxx)
isOuter - Flag that indicates whether the circle is the outer surrounding circle
**/
function Circle(origin, radius, id, tangencyList, parentCircle, level, color)
{
	var self = this;

	this._origin = origin;//private unit origin
	this._radius = radius;//private unit origin

	this.id = id;

	this.radiusRatio = this._radius / circleWrapper._radius;

	this.tangencyList = tangencyList;
	this.parentCircle = parentCircle;
	this.level = level;
	this.color = color;
	this.isOuter = false;
	this.element = null;

	this.origin = function(){
		var real = circleWrapper.topLeftX + (circleWrapper.diameter * self.originRatioX);
		var img = circleWrapper.topLeftY + (circleWrapper.diameter * self.originRatioY);
		return new ComplexNumber(real, img);
	};

	this.radius = function(){
		return circleWrapper.radius * self.radiusRatio;
	};

	this.diameter = function(){
		return self.radius() * 2;
	}

	this.topLeftX = function(){
		return self.origin().real - self.radius();
	};

	this.topLeftY = function(){
		return self.origin().img - self.radius();
	};

	//returns true if the user double clicks inside the radius of the circle
	this.isClicked = function circleIsClicked(){
		return (Math.pow(mouseX - self.origin().real, 2) + Math.pow(mouseY - self.origin().img, 2) < Math.pow(self.radius(), 2));
	};

	this.animateViewToCircle = function(){	
		if(self.diameter() <= fullScreenDiameter){
			animationTranslate(this, 500, animationZoom);//translate then zoom in
		}
		else{
			animationZoom(this, 500, animationTranslate);//zoom out then translate
		}
	};

	//ratios of the x & y values of the origin of the circle with respect to the diamter of the circleWrapper
	this.originRatioX = (this._origin.real - circleWrapper._topLeftX) / circleWrapper._diameter;
	this.originRatioY = (this._origin.img - circleWrapper._topLeftY) / circleWrapper._diameter;
	this.top = (((this.topLeftY() - circleWrapper.topLeftY) / circleWrapper.diameter) * 100);
	this.left = (((this.topLeftX() - circleWrapper.topLeftX) / circleWrapper.diameter) * 100);

	//CSS properties
	this.width = this.radiusRatio * 100;
	//var html = (this.radius() > 10) ? "Level: " this.level : "";

	//create and add element to the DOM
	this.createElement = function(){
		self.element = $("<div/>")
							.attr("id", self.id)
							.attr("unselectable", "on")
							.css({"width": self.width + "%", 
								"height": self.width + "%", 
								"top": self.top + "%", 
								"left": self.left + "%",
								"background-color": self.color,
								"font-size": "10%", 
								"z-index" : 1,
								"display": "none"})
							.addClass("circle")
							.fadeIn();

		circleWrapper.element.append(self.element);
	};

	//remove the element from the DOM
	this.removeElement = function(){
		self.element.remove();
		self.element = null;
	};

	//check if this circle is currently in view and big enough to be displayed
	//creates/removes the circle element in the DOM and buffer depending whether it is in view or not
	//returns true if circle is in view and large enough to be displayed, otherwise false
	this.isVisible = function(){

		//check if the circle is currently in view and large enough to be displayed
		var visible = (
	        self.topLeftY() >= -self.diameter() &&
	        self.topLeftX() >= -self.diameter() &&
	        self.topLeftY() <= window.innerHeight &&
	        self.topLeftX() <= window.innerWidth && 
	       	self.top >= 0 &&
	       	self.left >= 0 &&
	        self.diameter() >= MAX_CIRCLE_DIAMETER
	    );

		if(visible){
			if(self.element == null){//circle div element does not already exist in the DOM
				self.createElement();
			}

			if(buffer[self.id] == null){
				buffer[self.id] = self;
			}
		}
		else{
			if(self.element != null){
				self.removeElement();
			}

			if(buffer[self.id] != null){
				delete buffer[self.id];
			}
		}

		return visible;
	};
}

/*
Represents a number in the form x + i, where x is a real number and img is an imaginary number
*/
function ComplexNumber(real, img)
{
	this.real = real;
	this.img = img;
}

/*
Represents a polar coordinate with a radius 'r' and an angle 'theta'
*/
function PolarCoordinate(r, theta)
{
	this.r = r;
	this.theta = theta;
}

/*
Converts an angle in radians to an angle in degrees
*/
function radiansToDegrees(theta)
{
	return theta * (180 / Math.PI);
}

/*Converts a complex number to a polar PolarCoordinate*/
function toPolar(complexNumber)
{
	var r = Math.sqrt((complexNumber.real * complexNumber.real) + (complexNumber.img * complexNumber.img));
	var theta = Math.atan2(complexNumber.img, complexNumber.real);

	return new PolarCoordinate(r, theta);
}

/*Takes the square root of complex number*/
function sqrtC(num)
{
	var polarForm = toPolar(num);
	
	//z = +- r^1/2 * (cos(theta/2) + isin(theta/2))
	var inner = new ComplexNumber(Math.cos(polarForm.theta / 2), Math.sin(polarForm.theta / 2));
	var z = mRC(Math.sqrt(polarForm.r, 2), inner);
	
	return z;
}

/*Adds 2 complex numbers*/
function aCC(num1, num2)
{
	return new ComplexNumber(num1.real + num2.real, num1.img + num2.img);
}

/*Subtracts 2 complex numbers*/
function sCC(num1, num2)
{
	return new ComplexNumber(num1.real - num2.real, num1.img - num2.img);
}

/*Multiplies a real number with a complex number*/
function mRC(real, complex)
{
	return new ComplexNumber(complex.real * real, complex.img * real);
}

/*Multiplies 2 complex numbers together*/
function mCC(num1, num2)
{
	var c = new ComplexNumber(0, 0);
	
	var t1 = num1.real * num2.real;//real
	var t2 = num1.real * num2.img;//imaginary
	var t3 = num1.img * num2.real;//imaginary
	var t4 = num1.img * num2.img;//real
	
	c.real = t1 + (-1 * t4);
	c.img = t2 + t3;
	
	return c;
}
/*Generates another circle tangent to the three input circles*/

function calculateCircle(c1, c2, c3, properties, pathIndex, level)
{	
	calCount++;
	
	var k1 = properties.k1;
	var k2 = properties.k2;
	var k3 = properties.k3;
	var k4 = properties.k4;
	
	var z4 = mRC((1/k4), aCC(aCC(aCC(mRC(k1, c1._origin), mRC(k2, c2._origin)), mRC(k3, c3._origin)), mRC(2, sqrtC(aCC(aCC(mRC(k1*k2, mCC(c1._origin, c2._origin)), mRC(k2*k3, mCC(c2._origin, c3._origin))), mRC(k1*k3, mCC(c1._origin, c3._origin)))))));
	var tangencyList = [c1, c2, c3];
	var circ = new Circle(z4, 1/k4, c1.id + pathIndex, tangencyList, c1, level+1, "#FFFFFF", false);
	
	return circ;
}

function calculateCircleProperties(c1, c2, c3)
{
	var k1 = (c1.isOuter) ? -1 / c1._radius : 1 / c1._radius;
	var k2 = (c2.isOuter) ? -1 / c2._radius : 1 / c2._radius;
	var k3 = (c3.isOuter) ? -1 / c3._radius : 1 / c3._radius;
	var k4 = k1 + k2 + k3 + (2 * Math.sqrt((k1*k2) + (k2*k3) + (k1*k3)));

	var radiusRatio = (1/k4) / circleWrapper._radius;
	var radius = circleWrapper.radius * radiusRatio;
	var diameter = radius * 2;

	return {"k1": k1, "k2": k2, "k3": k3, "k4": k4, "diameter": diameter};
}

/*Recursively packs circles into the gasket*/
function Pack(circ, level)
{
	if(circ.isVisible())
	{
		if(buffer[circ.id + "0"] == null){//check to see if children circles already exist
			var properties = calculateCircleProperties(circ, circ.tangencyList[0], circ.tangencyList[1]);

			if(properties.diameter >= MAX_CIRCLE_DIAMETER){
				var c1 = calculateCircle(circ, circ.tangencyList[0], circ.tangencyList[1], properties, "0", level);

				if(c1.isVisible()){
					Pack(c1, c1.level);	
				}
			}
		}

		if(buffer[circ.id + "1"] == null){//check to see if children circles already exist
			var properties = calculateCircleProperties(circ, circ.tangencyList[1], circ.tangencyList[2]);

			if(properties.diameter >= MAX_CIRCLE_DIAMETER){
				var c2 = calculateCircle(circ, circ.tangencyList[1], circ.tangencyList[2], properties, "1", level);

				if(c2.isVisible()){
					Pack(c2, c2.level);	
				}
			}
		}

		if(buffer[circ.id + "2"] == null){//check to see if children circles already exist
			var properties = calculateCircleProperties(circ, circ.tangencyList[0], circ.tangencyList[2]);

			if(properties.diameter >= MAX_CIRCLE_DIAMETER){
				var c3 = calculateCircle(circ, circ.tangencyList[0], circ.tangencyList[2], properties, "2", level);

				if(c3.isVisible()){
					Pack(c3, c3.level);	
				}
			}
		}
	}
}

//Gasket update functions
function translate(x, y)
{
	if(circleWrapper.topLeftX + x <= centerX + 50 && circleWrapper.topLeftY + y <= centerY + 50 &&
		circleWrapper.topRightX + x >= centerX - 50 && circleWrapper.topRightY + y >= centerY - 50 && !animating){

		circleWrapper.origin.real += x;
		circleWrapper.origin.img += y;
		circleWrapper.updateTopLeftCSS();

		updateBuffer("translate");
	}	
}

//zoom the gasket in or out
function zoom(direction)
{
	if(!animating){
		var xi = (screenWidth/2) - circleWrapper.origin.real;
		var yi = (screenHeight/2) - circleWrapper.origin.img;

		var xRatio = xi / circleWrapper.diameter;
		var yRatio = yi / circleWrapper.diameter;

		if(direction == "zoomIn"){
			circleWrapper.radius = circleWrapper.radius * 1.15;
		}
		else if(direction == "zoomOut"){
			circleWrapper.radius = circleWrapper.radius * .85;
		}

		var xf = circleWrapper.diameter * xRatio;
		var yf = circleWrapper.diameter * yRatio;

		deltaX = xf - xi;
		deltaY = yf - yi;

		circleWrapper.origin.real -= deltaX;
		circleWrapper.origin.img -= deltaY;

		circleWrapper.updateCSS();
		updateBuffer(direction);
	}
}

//packs and removes circles
//operation - The operation to perform on the gasket ('zoomIn', 'zoomOut', 'translate')
function updateBuffer(operation)
{
	//var t0 = new Date().getTime();
	calCount = 0;
	buffer[circ4.id] = circ4;
	buffer[circ5.id] = circ5;

	Object.keys(buffer).forEach(function(key){
		var circle = buffer[key];

		Pack(circle, circle.level);

		//no need to search parent circles when zooming in
		if(operation != "zoomIn" &&
			circle.parentCircle != null && buffer[circle.parentCircle.id] == null){//pack parent circles if they're visible
			Pack(circle.parentCircle, circle.parentCircle.level);
		}
	});

	/*var t1 = new Date().getTime();
	var deltaT = t1 - t0;

	console.info("Update buffer time: " + deltaT + "ms");*/
}

//end gasket update functions

//Mouse control functions

function mouseDown(e)
{
	mouseClickDown = true;
	mouseX = e.clientX;
	mouseY = e.clientY;
}

function mouseUp()
{
	mouseClickDown = false;
	mouseMove = false;
}

function setMouseLocation(e)
{
	mouseMove = true;

	if(!e){
		e = window.event;
	}

	if(first){
		mouseX = e.clientX;
		mouseY = e.clientY;
		pMouseX = e.clientX;
		pMouseY = e.clientY;
		first = false;
	}

	else{
		pMouseX = mouseX;
		pMouseY = mouseY ;
		mouseX = e.clientX;
		mouseY = e.clientY;
	}

	if(mouseClickDown){
		translate(-1*(pMouseX-mouseX), -1*(pMouseY-mouseY));
	}
}

//end mouse control functions

function initGasket()
{
	jQuery.fx.interval = 30;

	//initialize event handlers
	document.onmousemove = setMouseLocation;
	document.onmousedown = mouseDown;
	document.onmouseup = mouseUp;

	body.dblclick(function(e){
		mouseX = e.clientX;
		mouseY = e.clientY;
		var keys = Object.keys(buffer);
	});

	centerX = screenWidth / 2;
	centerY = screenHeight / 2;

	wrapper.width(screenWidth);
	wrapper.height(screenHeight);

	//create initial circles
	circleWrapper = new CircleWrapper(new ComplexNumber(centerX, centerY));
	circ2 = new Circle(new ComplexNumber(0.75, 1), 0.25, "0", new Array(), null, 1, '#FFFFFF', false);
	circ3 = new Circle(new ComplexNumber(1.25, 1), 0.25, "1", new Array(), null, 1, '#FFFFFF', false);
	circ4 = new Circle(new ComplexNumber(1, (2/3)), (1/6), "2", new Array(), null, 2, '#FFFFFF', false);
	circ5 = new Circle(new ComplexNumber(1, (4/3)), (1/6), "3", new Array(), null, 2, '#FFFFFF', false);

	circ4.tangencyList.push(circleWrapper, circ2, circ3);
	circ5.tangencyList.push(circleWrapper, circ2, circ3);

	circ2.createElement();
	circ3.createElement();

	body.dblclick(function(e){
		if(animating == false){//don't allow dblClicking if the gasket is currently in the middle of an animation
			mouseX = e.clientX;
			mouseY = e.clientY;

			//check circ2 and circ3 by hand since they're not in the buffer
			if(circ2.isClicked()){
				circ2.animateViewToCircle();
			}
			else if(circ3.isClicked()){		
				circ3.animateViewToCircle();
			}
			else{
				var keys = Object.keys(buffer);
				for(var i = 0; i < keys.length; i++){
					var key = keys[i];
					var circle = buffer[key];

					if(circle.isClicked()){
						circle.animateViewToCircle();
						break;
					}
				}
			}
		}
	});

	introAnimation(circleWrapper, 600);
}

initGasket();