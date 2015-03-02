var GL = (function() {
	var	getShader = function(gl, id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return null;
		}

		var str = "";
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType == 3) {
				str += k.textContent;
			}
			k = k.nextSibling;
		}

		var shader;
		if (shaderScript.type == "x-shader/x-fragment") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (shaderScript.type == "x-shader/x-vertex") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}

		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	};

	return {
		setMatrixUniforms: function(gl, shaderProgram, pMatrix, mvMatrix) {
			gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
			gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
		},

		createBuffers: function(gl, width, height, options) {
			var squareVertexPositionBuffer;
			var squareVertexColorBuffer;
			var squareVertexTextureCoordBuffer;

			squareVertexPositionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);

			var vertices = [
				width, 	height, 0.0,
				0.0,  	height, 0.0,
				width, 	0.0,  	0.0,
				0.0, 		0.0,  	0.0
			];

			//console.info("Verts: ", vertices);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			squareVertexPositionBuffer.itemSize = 3;
			squareVertexPositionBuffer.numItems = 4;

			squareVertexTextureCoordBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexTextureCoordBuffer);
			var textureCoords = [
				0.0, 0.0,
				1.0, 0.0,
				0.0, 1.0,
				1.0, 1.0];
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
			squareVertexTextureCoordBuffer.itemSize = 2;
			squareVertexTextureCoordBuffer.numItems = 4;

			squareVertexColorBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
			colors = [];
			var color = [0.5, 0.5, 1.0, 1.0];
			if(options.backgroundColor) {
				color = options.backgroundColor;
			}
			for (var i=0; i < 4; i++) {
				colors = colors.concat(color);
			}
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
			squareVertexColorBuffer.itemSize = 4;
			squareVertexColorBuffer.numItems = 4;
			return {position: squareVertexPositionBuffer, color: squareVertexColorBuffer, texture: squareVertexTextureCoordBuffer};
		},

		createShaders: function(gl, fragmentShaderId, vertexShaderId) {
			var shaderProgram;
			var fragmentShader = getShader(gl, fragmentShaderId);
			var vertexShader = getShader(gl, vertexShaderId);

			shaderProgram = gl.createProgram();
			gl.attachShader(shaderProgram, vertexShader);
			gl.attachShader(shaderProgram, fragmentShader);
			gl.linkProgram(shaderProgram);

			if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				console.error("Could not initialise shaders");
			}

			gl.useProgram(shaderProgram);

			shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
			gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

			shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
			gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

			shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
			shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
			shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

			// shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
			// gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

			// shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
			// gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

			// shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
			// shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
			return shaderProgram;
		},

		initTexture: function(gl, url, done) {
			var texture = gl.createTexture();
				texture.image = new Image();
				texture.image.onload = function() {
					console.log("Texture loaded: ", texture);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.bindTexture(gl.TEXTURE_2D, null);
					done(texture);
				}

				texture.image.src = url;
				return texture;
		},

		clear: function(gl) {
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		},

		initDraw: function(gl, pMatrix, mvMatrix) {
			//TODO: once per view..
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.enable(gl.DEPTH_TEST);

			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			mat4.ortho(0, gl.viewportWidth, 0, gl.viewportHeight, 0.1, 100.0, pMatrix);
			// mat4.identity(mvMatrix);
			// mat4.translate(mvMatrix, [0.0, 0.0, -1.0]);
		},

		drawBuffers: function(gl, pMatrix, mvMatrix, shaderProgram, buffers, texture) {
			//positionBuffer, colorBuffer) {
			var positionBuffer = buffers.position;
			var colorBuffer = buffers.color;
			var textureBuffer = buffers.texture;

			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
			gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(shaderProgram.samplerUniform, 0);

			// gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
			// gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
			// gl.enableClientState(gl.TEXTURE_COORD_ARRAY_EXT);
			GL.setMatrixUniforms(gl, shaderProgram, pMatrix, mvMatrix);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer.numItems);
		}
	}
})();