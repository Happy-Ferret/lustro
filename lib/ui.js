"use strict";

var GLContext = function(canvas) {
	try {
		//TODO: refactor the hardcoded strings in this block
		this.gl = canvas.getContext("experimental-webgl");
		this.gl.viewportWidth = canvas.width;
		this.gl.viewportHeight = canvas.height;
		this.shaders = Shader.createShaders(this.gl, "fragmentStd", "vertexStd");
		this.mvMatrix = mat4.create();
		this.pMatrix = mat4.create();
	} catch (e) {
		console.error(e);
	}
};

GLContext.prototype.get = function() {
	return this.gl;
};

GLContext.prototype.getMvMatrix = function() {
	return this.mvMatrix;
};

GLContext.prototype.getpMatrix = function() {
	return this.pMatrix;
};

GLContext.prototype.getShaders = function() {
	return this.shaders;
};

var UI = (function() {
	var updateNode = function(node, dt) {
		if(node.update) {
			node.update();
		}
		if(node.components) {
			node.components.forEach(function(component) {
				if(node[component.name].update) {
					node[component.name].update(dt);
				}
			});
		}
	};

	var lastTime = Date.now();
	var renderNode = function(node, inheritedPosition, root, dt) {
		if(node.props) {
			//console.log("RENDER NODE: ", node.props.name, node.options.background);
			//TODO: only on initialise.
			if(node.props.backgroundColor) {
				node._backgroundColor = node.props.backgroundColor;
			}
			var isStatic = !node.Animator;
			if(node.props.background) {
				if(!node._background) {
					node._background = node.props.background;
					//console.log("Init texture...");
					Texture.initTexture(root._context.get(), node._background, function(atlassedTexture) {
						node._atlassedTexture = atlassedTexture;
						node._textureLoaded = true;
						// TODO: figure out a nice fully async way to do createBuffers and merge
						// it with the call further down
						node._buffers = GL.createBuffers(root._context.get(),
									node._width, node._height, node._backgroundColor,
									node._atlassedTexture.uvs, isStatic);

						//console.log("Texture loaded.");
					});
				}
			}
			if(!node._buffers && !node._background) {
				//console.log("Creating buffers");
				node._buffers = GL.createBuffers(root._context.get(),
							node._width, node._height, node._backgroundColor, isStatic);
			}

			//console.log("Has props, let's draw it ", node.options.buffers);
			
			var top = node.props.top;
			var left = node.props.left;
			if(inheritedPosition) {
				if(inheritedPosition.top) {
					top += inheritedPosition.top;
				}
				if(inheritedPosition.left) {
					left += inheritedPosition.left;
				}
			}
			//console.log("T: ",[left, root._height-(top+node._height), -1.0]);

			mat4.identity(node.tm);
			mat4.translate(node.tm, node.tm, vec3.fromValues(left, root._height-(top+node._height), -1.0));
			mat4.translate(node.tm, node.tm, node.localPosition);
			var draw = function() {
				GL.drawBuffers(root._context.get(),
							root._context.getpMatrix(),
							node.tm,
							root._context.getShaders(),
							node._buffers,
							node._atlassedTexture);
			};
			// update node if necessary
			updateNode(node, dt);

			if(!node._atlassedTexture && node._backgroundColor) {
				//console.info(node.props, " has no background drawing now! ", node.options);
				draw();
			} else if(node._atlassedTexture && node._textureLoaded) {
				//console.log("Drawing textured node");
				draw();
			}
		}
		node.children.forEach(function(child) {
			//console.info("Rendering child: ", child.options.background, child.props.background);
			renderNode(child, {top: top, left: left}, root, dt);
		});
		node.render();
	};
	return {
		/**
		 Returns a factory method to create an instance of this component.
		 */
		component: function(def) {
			return function(props) {
				var _this = Object.create(def);
				_this.tm = mat4.create();
				_this.localPosition = vec3.fromValues(0, 0, -1.0);
				//mat4.translate(_this.lt, _this.lt, vec3.fromValues(0, 0, -1.0));
				//console.info("this.tm = ", _this.tm);
				if(_this.start) {
					_this.start();
				}
				if(_this.components) {
					_this.components.forEach(function(component) {
						_this[component.name] = Object.create(component);
						_this[component.name].root = _this;
						if(_this[component.name].start) {
							_this[component.name].start();
						}
					}.bind(_this));
				}
				return _this;
			}
		},
		new: function(component, props) {
			//1. clone def
			//2. set props
			//3. init matrices
			//4. call lifecycle method(s)
			var component = arguments[0];
			var props = arguments[1];
			var inst = component(props);
			inst.props = props;
			inst._width = props.width;
			inst._height = props.height;
			inst.children = [];
			//console.log("INST: ", inst);
			for(var i=2; i<arguments.length; i++) {
				inst.children.push(arguments[i]);
			}
			return inst;
		},
		render: function(rootComponent, rootCanvas) {
			var root = new rootComponent();
			//console.info("ROOT: ", root);
			root._context = new GLContext(rootCanvas);
			root._width = rootCanvas.width;
			root._height = rootCanvas.height;
			// Initial render
			var nodes = root.render();

			GL.initDraw(root._context.get(),
						root._context.getpMatrix(),
						root._context.getMvMatrix());

			window.framesPerSecond = 0;

			//TODO: shim requestAnimationFrame if not present
			var tick = function() {
				var deltaTimeMs = Date.now() - lastTime;
				var deltaTimeSeconds = deltaTimeMs/1000.0;
				window.drawCalls = 0;
				window.textureBinds = 0;
				//TODO: extract fps into a component or plugin
				window.framesPerSecond = parseInt(1.0/deltaTimeSeconds);

				lastTime = Date.now();
				GL.clear(root._context.get());
				renderNode(nodes, undefined, root, deltaTimeSeconds);

				requestAnimationFrame(tick);
			};
			
			requestAnimationFrame(tick);
		}
	}
})();


