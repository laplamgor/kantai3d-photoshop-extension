(function ()
{
    'use strict';

    var csInterface = new CSInterface();

    function init()
    {
        themeManager.init();
        $("#aply").click(function ()
        {
            var result = window.cep.fs.showOpenDialog(false, false, "Test Dialog", "", ["png", "jpg"]);
            alert(result.data);
        }
        );

        var csInterface = new CSInterface();

        PIXI.DepthPerspectiveFilter = new PIXI.Filter(
                `
            #ifdef GL_ES
            precision highp float;
            #endif

            attribute vec2 aVertexPosition;
            attribute vec2 aTextureCoord;
            varying vec2 vTextureCoord;

            uniform mat3 projectionMatrix;

            void main(void)
            {
                vTextureCoord = aTextureCoord;
                gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            }
            `, 
                `
            precision mediump float;
            uniform vec2 offset;
            uniform vec2 pan;
            uniform float zoom;
            uniform int displayMode;

            uniform sampler2D uSampler;
            uniform sampler2D displacementMap;

            uniform float textureScale;
            uniform vec2 textureSize;
            uniform float textureWidth;
            uniform float textureHeight;
            uniform float frameWidth;
            uniform float frameHeight;
            uniform vec2 canvasSize;

            uniform vec4 filterArea;
            uniform vec4 filterClamp;


            varying vec2 vTextureCoord;
            varying vec4 vColor;
            uniform vec4 dimensions;
            uniform vec2 mapDimensions;
            uniform float scale;
            uniform float focus;


            vec2 mapPan(vec2 coord)
            {
                return vec2((coord[0]  + pan[0] / textureWidth / textureScale) / zoom,
                            (coord[1] + pan[1] / textureHeight / textureScale) / zoom);
            }

            vec2 mapCoord2(vec2 coord)
            {
                return vec2(coord[0] * frameWidth / textureWidth / textureScale,
                            coord[1] * frameHeight / textureHeight / textureScale);
            }


            vec4 textureDiffuseNoBg(vec2 coord)
            {
                vec2 c = coord;
                vec2 scale = textureSize * ( min(canvasSize[0]/textureSize[0], canvasSize[1]/textureSize[1]) );

                c -= 0.5;                   // Normalize
                c = c * canvasSize + pan;   // Convert to pixel count, where origin is the center
                c /= scale;

                c /= zoom;
                c += 0.5;                   // Unnormalize


                if (c[0] <= 0.0 || c[0] >= 1.0 || c[1] <= 0.0 || c[1] >= 1.0)
                {
                    return vec4(0.0);
                } else {
                    return texture2D(uSampler, c);
                }
            }


            vec4 textureDiffuse(vec2 coord)
            {
                vec4 withoutBg = textureDiffuseNoBg(coord);

                return withoutBg * withoutBg[3] + vec4(0.5, 0.5, 1.0, 1.0) * (1.0-withoutBg[3]);
            }

            vec4 textureDepth(vec2 coord)
            {
                vec2 c = coord;

                vec2 scale = textureSize * ( min(canvasSize[0]/textureSize[0], canvasSize[1]/textureSize[1]) );

                c -= 0.5;                   // Normalize
                c = c * canvasSize + pan;   // Convert to pixel count, where origin is the center
                c /= scale;

                c /= zoom;
                c += 0.5;                   // Unnormalize


                // if (c[0] <= 0.0 || c[0] >= 1.0 || c[1] <= 0.0 || c[1] >= 1.0)
                // {
                //     return vec4(0.0, 0.0, 0.0, 0.0);
                // }
                return texture2D(displacementMap, c);
            }

            vec4 grid(vec2 coord)
            {
                float lineW = 1.0 / frameWidth / zoom;
                float spaceW = lineW * 8.0;
                float spaceW2 = lineW * 32.0;
                float lineH = 1.0 / frameHeight / zoom;
                float spaceH = lineH * 8.0;
                float spaceH2 = lineH * 32.0;

                if (texture2D(uSampler, coord)[3] < 1.0)
                {
                    return vec4(0.0, 0.0, 0.0, 0.0);
                }

                if (mod(coord[0], spaceW2) < lineW || mod(coord[1], spaceH2) < lineH)
                {
                    return vec4(0.75, 0.75, 0.75, 0.75);
                }
                if (mod(coord[0], spaceW) < lineW || mod(coord[1], spaceH) < lineH)
                {
                    return vec4(0.5, 0.5, 0.5, 0.75);
                }
                return vec4(texture2D(displacementMap, mapCoord2(coord)).r);
            }

            vec4 normal(vec2 coord)
            {
                vec2 lineW = vec2(0.5 / frameWidth, 0.0);
                vec2 lineH = vec2(0.0, 0.5 / frameHeight);


                float leftD = textureDepth(coord - lineW).r;
                float rightD = textureDepth(coord + lineW).r;
                float upD = textureDepth(coord - lineH).r;
                float downD = textureDepth(coord + lineH).r;

                if (textureDiffuse(coord)[3] < 1.0)
                {
                    return vec4(0.5,0.5,1.0,1.0);
                }

                return vec4(0.5, 0.5, 1.0, 1.0) + vec4(leftD - rightD, upD - downD, 0.0, 0.0) * 100.0 * zoom;
            }

            vec4 normalMixed(vec2 coord)
            {
                return textureDiffuse(coord)  - vec4(0.5, 0.5, 1.0, 1.0) + normal(coord);
            }

            const float compression = 1.0;
            const float dmin = 0.0;
            const float dmax = 1.0;

            // sqrt(2)
            #define MAXOFFSETLENGTH 1.41421356
            // 10 * 1.1
            #define MAXZOOM 11.0

            #define MAXSTEPS 600.0


            float fit = min(canvasSize[0]/textureSize[0], canvasSize[1]/textureSize[1]);
            float steps = max(MAXSTEPS *length(offset *zoom*fit), 30.0);

            void main(void)
            {
                vec2 scale2 = scale * vec2(textureHeight / frameWidth,
                                           textureWidth / frameHeight )
                              * vec2(1, -1);
                mat2 baseVector =
                    mat2(vec2((0.5 - focus) * (offset * zoom*fit) - (offset * zoom*fit) / 2.0) * scale2,
                         vec2((0.5 - focus) * (offset * zoom*fit) + (offset * zoom*fit) / 2.0) * scale2);


                vec2 pos = (vTextureCoord);
                mat2 vector = baseVector;

                float dstep = compression / (steps - 1.0);
                vec2 vstep = (vector[1] - vector[0]) / vec2((steps - 1.0));

                vec2 posSumLast = vec2(0.0);
                vec2 posSum = vec2(0.0);

                float weigth = 1.0;
                float dpos;
                float dposLast;

                for (float i = 0.0; i < MAXSTEPS * MAXOFFSETLENGTH * MAXZOOM; ++i)
                {
                    vec2 vpos = pos + vector[1] - i * vstep;
                    dpos = 1.0 - i * dstep;
                    float depth = textureDepth(vpos).r;

                    if (textureDiffuseNoBg(vpos)[3] == 0.0) {
                        depth = 0.0;
                    }

                    depth = clamp(depth, dmin, dmax);

                    if (dpos > depth)
                    {
                        posSumLast = vpos;
                        dposLast = dpos;
                    }
                    else
                    {
                        posSum = vpos;
                        weigth = (depth - dposLast) / dstep;
                        break;
                    }
                };
                vec2 coord = (posSum - posSumLast) * -clamp(weigth * 0.5 + 0.5, 0.0, 1.5) + posSum;
                if (displayMode == 0)
                {
                    gl_FragColor = textureDiffuse(coord);
                }
                else if (displayMode == 1)
                {
                    gl_FragColor = normal(coord);
                }
                else
                {
                    gl_FragColor = normalMixed(coord);
                }

            }`);

        PIXI.DepthPerspectiveFilter.apply = function (filterManager, input, output)
        {
            this.uniforms.dimensions = {};
            if (input && input.sourceFrame && input.size)
            {
                this.uniforms.dimensions[0] = input.sourceFrame.width;
                this.uniforms.dimensions[1] = input.sourceFrame.height;

                this.uniforms.frameWidth = input.size.width;
                this.uniforms.frameHeight = input.size.height;
            }

            this.uniforms.canvasSize = {};
            this.uniforms.canvasSize[0] = app.renderer.width;
            this.uniforms.canvasSize[1] = app.renderer.height;

            // draw the filter...
            filterManager.applyFilter(this, input, output);
        }

        const app = new PIXI.Application(
            {
                view: document.querySelector("#canvas"),
                width: 50,
                height: 50
            }
            );


        //~/AppData/Local/Temp/depth_preview.png
        //http://192.168.1.245/3d.jpg`
        var logo = new PIXI.Sprite.fromImage(csInterface.getSystemPath(SystemPath.EXTENSION) + "/depth_preview.png");

        // window.displacementSprite = PIXI.Sprite.fromImage(csInterface.getSystemPath( SystemPath.EXTENSION ) + "/depth_preview.png");
        window.displacementFilter = PIXI.DepthPerspectiveFilter;
        window.displacementFilter.uniforms.textureWidth = logo.texture.width;
        window.displacementFilter.uniforms.textureHeight = logo.texture.height;
        window.displacementFilter.uniforms.textureScale = 1.0;
        window.displacementFilter.padding = 0;

        window.displacementFilter.uniforms.pan = [0.0, 0.0];

        window.displacementFilter.uniforms.displacementMap = PIXI.Texture.fromImage(csInterface.getSystemPath(SystemPath.EXTENSION)
                 + "/depth_preview.png");
        window.displacementFilter.uniforms.scale = 1.0;
        window.displacementFilter.uniforms.focus = 0.5;
        window.displacementFilter.uniforms.offset = [0.0, 0.0];

        window.displacementFilter.uniforms.displayMode = 0;

        //app.stage.filterArea = app.screen;
        app.stage.filters = [window.displacementFilter];
        app.stage.addChild(logo);

        var tiltX;
        var tiltY;
        var isTilting = false;

        var panX;
        var panY;
        var isPanning = false;

        window.addEventListener('mousedown', function (event)
        {
            switch (event.which)
            {
            case 1:
                tiltX = app.renderer.plugins.interaction.mouse.global.x;
                tiltY = app.renderer.plugins.interaction.mouse.global.y;
                isTilting = true;
                break;
            case 2:
                panX = app.renderer.plugins.interaction.mouse.global.x;
                panY = app.renderer.plugins.interaction.mouse.global.y;
                isPanning = true;
                break;
            case 3:
                break;
            default:
                alert('You have a strange Mouse!');
            }
        }
        );

        window.addEventListener('mouseup', function (event)
        {
            switch (event.which)
            {
            case 1:
                isTilting = false;
                break;
            case 2:
                isPanning = false;
                break;
            case 3:
                break;
            default:
                alert('You have a strange Mouse!');
            }
        }
        );

        window.displacementFilter.uniforms.zoom = 1.0;
        $('#canvas').bind('mousewheel', function (e)
        {
            if (e.originalEvent.wheelDelta / 120 > 0)
            {
                if (window.displacementFilter.uniforms.zoom < 30.0)
                {
                    window.displacementFilter.uniforms.zoom *= 1.1;

                    var mx = app.renderer.plugins.interaction.mouse.global.x - app.renderer.width / 2.0;
                    window.displacementFilter.uniforms.pan[0] += mx;
                    window.displacementFilter.uniforms.pan[0] *= 1.1;
                    window.displacementFilter.uniforms.pan[0] -= mx;

                    var my = app.renderer.plugins.interaction.mouse.global.y - app.renderer.height / 2.0;
                    window.displacementFilter.uniforms.pan[1] += my;
                    window.displacementFilter.uniforms.pan[1] *= 1.1;
                    window.displacementFilter.uniforms.pan[1] -= my;

                }
            }
            else
            {
                window.displacementFilter.uniforms.zoom /= 1.1;

                var mx = app.renderer.plugins.interaction.mouse.global.x - app.renderer.width / 2.0;
                window.displacementFilter.uniforms.pan[0] += mx;
                window.displacementFilter.uniforms.pan[0] /= 1.1;
                window.displacementFilter.uniforms.pan[0] -= mx;

                var my = app.renderer.plugins.interaction.mouse.global.y - app.renderer.height / 2.0;
                window.displacementFilter.uniforms.pan[1] += my;
                window.displacementFilter.uniforms.pan[1] /= 1.1;
                window.displacementFilter.uniforms.pan[1] -= my;
            }
        }
        );

        function step(timestamp)
        {
            if (logo && logo.texture && app.renderer.view.style)
            {
                var endx = app.renderer.plugins.interaction.mouse.global.x;
                var endy = app.renderer.plugins.interaction.mouse.global.y;

                if (isTilting)
                {
                    var radius = Math.min(app.renderer.width, app.renderer.height);
                    window.displacementFilter.uniforms.offset[0] -= ((endx - tiltX) / radius * 2);
                    window.displacementFilter.uniforms.offset[1] += ((endy - tiltY) / radius * 2);

                    var xy = Math.sqrt(window.displacementFilter.uniforms.offset[0] * window.displacementFilter.uniforms.offset[0] + window.displacementFilter.uniforms.offset[1] * window.displacementFilter.uniforms.offset[1]);
                    if (xy / 0.5 > 1)
                    {
                        window.displacementFilter.uniforms.offset[0] /= xy / 0.5;
                        window.displacementFilter.uniforms.offset[1] /= xy / 0.5;
                    }

                    tiltX = endx;
                    tiltY = endy;
                }

                if (isPanning)
                {
                    window.displacementFilter.uniforms.pan[0] -= ((endx - panX));
                    window.displacementFilter.uniforms.pan[1] -= ((endy - panY));

                    panX = endx;
                    panY = endy;
                }

            }
            window.requestAnimationFrame(step);
        }

        window.requestAnimationFrame(step);

        // window.onresize = function (event){
        // var w = window.innerWidth;
        // var h = window.innerHeight;
        // //this part resizes the canvas but keeps ratio the same
        //     app.renderer.view.style.width = w + "px";
        //   app.renderer.view.style.height = h + "px";
        //    //this part adjusts the ratio:
        //    app.renderer.resize(w,h);


        //    alert(w);
        // }

        // Listen for window resize events
        window.addEventListener('resize', resize);

        // Resize function window
        function resize()
        {
            // Resize the renderer
            var c = $("#canvas");
            c.prop('width', window.innerWidth);
            c.prop('height', window.innerHeight);
            app.renderer.resize(window.innerWidth, window.innerHeight);
            //alert(window.innerWidth);
            // You can use the 'screen' property as the renderer visible
            // area, this is more useful than view.width/height because
            // it handles resolution
            //rect.position.set(app.screen.width, app.screen.height);


            logo.width = app.renderer.screen.width;
            logo.height = app.renderer.screen.height;
        }

        resize();


        var menuJson = `{
                            "menu": [
                                {
                                    "id": "basicTextureMode",
                                    "label": "Basic Texture",
                                    "enabled": true,
                                    "checkable": true,
                                    "checked": true
                                },
                                {
                                    "id": "normalMapMode",
                                    "label": "Normal Map",
                                    "enabled": true,
                                    "checkable": true,
                                    "checked": false
                                },
                                {
                                    "id": "mixedMode",
                                    "label": "Mixed",
                                    "enabled": true,
                                    "checkable": true,
                                    "checked": false
                                },
                                {
                                    "label": "---"
                                },
                                {
                                    "id": "scaleDepth",
                                    "label": "Scale Depth",
                                    "enabled": true,
                                    "checkable": false,
                                    "checked": false,
                                     "menu": [
                                        {
                                            "id": "scaleDepth*2",
                                            "label": "×2.0",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "scaleDepth*1.3",
                                            "label": "×1.3",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "scaleDepth*1.1",
                                            "label": "×1.1",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "label": "---"
                                        },
                                        {
                                            "id": "scaleDepth/1.1",
                                            "label": "÷1.1",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "scaleDepth/1.3",
                                            "label": "÷1.3",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "scaleDepth/2",
                                            "label": "÷2.0",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        }
                                    ]
                                },
                                {
                                    "label": "---"
                                },
                                {
                                    "id": "reposition",
                                    "label": "Refresh",
                                    "enabled": true,
                                    "checkable": false,
                                    "checked": false
                                }
                            ]
                        }`;
        csInterface.setContextMenuByJSON(menuJson, contextMenuCallback);

        function contextMenuCallback(menuID)
        {
            if (menuID === "basicTextureMode" || menuID === "normalMapMode" || menuID === "mixedMode") {
                changeDisplayMode(menuID);
            }
            if (menuID === "reposition") {
                loadBaseImage()
                window.displacementFilter.uniforms.pan = [0.0, 0.0];
                window.displacementFilter.uniforms.offset = [0.0, 0.0];
                window.displacementFilter.uniforms.zoom = 1.0;
            }
            switch(menuID) {
              case "scaleDepth*2":
                adjustAllLevels(2.0);
                break;
              case "scaleDepth*1.3":
                adjustAllLevels(1.3);
                break;
              case "scaleDepth*1.1":
                adjustAllLevels(1.1);
                break;
              case "scaleDepth/1.1":
                adjustAllLevels(1.0/1.1);
                break;
              case "scaleDepth/1.3":
                adjustAllLevels(1.0/1.3);
                break;
              case "scaleDepth/2":
                adjustAllLevels(0.5);
                break;
            }
        }

        function changeDisplayMode(mode){
            csInterface.updateContextMenuItem("basicTextureMode", true, false);
            csInterface.updateContextMenuItem("normalMapMode", true, false);
            csInterface.updateContextMenuItem("mixedMode", true, false);
            csInterface.updateContextMenuItem(mode, true, true);

            switch(mode) {
              case "basicTextureMode":
                window.displacementFilter.uniforms.displayMode = 0;
                break;
              case "normalMapMode":
                window.displacementFilter.uniforms.displayMode = 1;
                break;
              case "mixedMode":
                window.displacementFilter.uniforms.displayMode = 2;
            }
        }


        // Load the image as the default
        function loadBaseImage() {
            csInterface.evalScript("app.activeDocument.fullName.fsName.replace(/\\\\/g, '/')", function (path)
            {
                var url = path.replace('_depth', '').replace('.psd', '.png') + "?_=" + (new Date().getTime());
                var img = new Image();
                img.onload = function ()
                {
                    var baseTexture = new PIXI.BaseTexture(img);
                    var texture = new PIXI.Texture(baseTexture);
                    logo.setTexture(texture);

                    window.displacementFilter.uniforms.textureWidth = logo.texture.width;
                    window.displacementFilter.uniforms.textureHeight = logo.texture.height;

                    window.displacementFilter.uniforms.textureSize = [logo.texture.width, logo.texture.height];

                    window.displacementFilter.uniforms.textureScale = 1.0;

                }
                img.src = url;

                currentDepthPngPath = path.replace('.psd', '.png');
                updatePreview();
            }
            );
        }

        loadBaseImage();

        // Register events
        csInterface.evalScript(`stringIDToTypeID( "toolModalStateChanged" )`, function (id)
        {
            register(id); // toolModalStateChanged, almost everything done with toolbox
            register(1936483188); // 'slct' (e.g. change history state)
            register(1399355168); // 'Shw' (show layer)
            register(1214521376); // 'Hd  ' (hide layer)
        }
        );

        // Register events for undo+redo
        csInterface.evalScript(`stringIDToTypeID( "invokeCommand" )`, function (id)
        {
            register(id); // invokeCommand, almost everything done with shortcut
        }
        );

        function register(eventId)
        {
            var event = new CSEvent("com.adobe.PhotoshopRegisterEvent", "APPLICATION");
            event.data = eventId.toString();
            var gExtensionID = csInterface.getExtensionID();
            event.extensionId = gExtensionID;
            csInterface.dispatchEvent(event);

            csInterface.addEventListener("com.adobe.PhotoshopJSONCallback" + gExtensionID, eventCallback);
        }

        function eventCallback(csEvent)
        {
            updatePreview();
        }

        var currentDepthPngPath = "";
        function updatePreview()
        {
            var scriptSavePng = `
                if (app.documents.length != 0) {
                  var doc= app.activeDocument;

                  var opts, file;
                  opts = new ExportOptionsSaveForWeb();
                  opts.format = SaveDocumentType.PNG;
                  opts.PNG8 = true;
                  opts.quality = 0;

                  pngFile = new File("${currentDepthPngPath}");
                  app.activeDocument.exportDocument(pngFile, ExportType.SAVEFORWEB, opts);
                }
                `;

            csInterface.evalScript(scriptSavePng, function (res)
            {
                var u = currentDepthPngPath + "?_=" + (new Date().getTime());
                var img = new Image();
                img.onload = function ()
                {
                    var baseTexture = new PIXI.BaseTexture(img);
                    var texture = new PIXI.Texture(baseTexture);
                    window.displacementFilter.uniforms.displacementMap = texture;
                }
                img.src = u;
            }
            );
        }


        function adjustAllLevels(multiplier) {
            var fromStart = 0;
            var fromEnd = 255;
            var toStart = 0;
            var toEnd = 255;

            if (multiplier > 1.0) {
                var offset = Math.floor(127.0 / multiplier);
                fromStart = 127 - offset;
                fromEnd = 128 + offset;
            } else {
                var offset = Math.floor(127.0 * multiplier);
                toStart = 127 - offset;
                toEnd = 128 + offset;
            }

            var scriptScale = `
                var allTopLevelLayers = app.activeDocument.layers;
                loopLayers(allTopLevelLayers);

                function loopLayers(gp) {
                    var layer;
                    for(var i=0; i<gp.length; i++) {
                        layer = gp[i];
                        if(layer.typename == 'LayerSet') {
                            loopLayers(layer.layers);
                        } else {
                            changeLayer(layer);
                        }
                    }
                }

                function changeLayer(layer) {
                    try {
                        if (layer.visible) {
                            app.activeDocument.activeLayer = layer;
                            layer.adjustLevels(${fromStart}, ${fromEnd}, 1.0, ${toStart}, ${toEnd});
                        }
                    } catch(e) {
                        activeDocument.selection.deselect();
                    }
                }
            `;

            csInterface.evalScript(scriptScale, function (path) {});
        }
    }
    init();
}
    ());
