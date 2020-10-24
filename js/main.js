(function ()
{
    'use strict';

    var csInterface = new CSInterface();

    function init()
    {
        themeManager.init();

        var csInterface = new CSInterface();

        var vert = window.cep.fs.readFile(csInterface.getSystemPath(SystemPath.EXTENSION) + '/js/kantai3d.vert');
        var frag = window.cep.fs.readFile(csInterface.getSystemPath(SystemPath.EXTENSION) + '/js/kantai3d.frag');

        PIXI.DepthPerspectiveFilter = new PIXI.Filter(vert.data, frag.data);

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

        var depthMapImage = new PIXI.Sprite.fromImage("");

        window.displacementFilter = PIXI.DepthPerspectiveFilter;
        window.displacementFilter.uniforms.textureScale = 1.0;
        window.displacementFilter.padding = 0;

        window.displacementFilter.uniforms.pan = [0.0, 0.0];
        window.displacementFilter.uniforms.scale = 1.0;
        window.displacementFilter.uniforms.focus = 0.5;
        window.displacementFilter.uniforms.offset = [0.0, 0.0];

        window.displacementFilter.uniforms.displayMode = 0;

        app.stage.filters = [window.displacementFilter];
        app.stage.addChild(depthMapImage);

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
            if (depthMapImage && depthMapImage.texture && app.renderer.view.style)
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

            depthMapImage.width = app.renderer.screen.width;
            depthMapImage.height = app.renderer.screen.height;
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
                                    "id": "shiftDepth",
                                    "label": "Shift Depth",
                                    "enabled": true,
                                    "checkable": false,
                                    "checked": false,
                                     "menu": [
                                        {
                                            "id": "shiftDepth+25",
                                            "label": "+25",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "shiftDepth+5",
                                            "label": "+5",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "shiftDepth+1",
                                            "label": "+1",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "label": "---"
                                        },
                                        {
                                            "id": "shiftDepth-1",
                                            "label": "-1",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "shiftDepth-5",
                                            "label": "-5",
                                            "enabled": true,
                                            "checkable": false,
                                            "checked": false
                                        },
                                        {
                                            "id": "shiftDepth-25",
                                            "label": "-25",
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
                                },
                                {
                                    "label": "---"
                                },
                                {
                                    "id": "about",
                                    "label": "About this extension",
                                    "enabled": true,
                                    "checkable": false,
                                    "checked": false
                                }
                            ]
                        }`;
        csInterface.setContextMenuByJSON(menuJson, contextMenuCallback);

        function contextMenuCallback(menuID)
        {
            if (menuID === "basicTextureMode" || menuID === "normalMapMode" || menuID === "mixedMode")
            {
                changeDisplayMode(menuID);
            }
            if (menuID === "reposition")
            {
                loadBaseImage()
                window.displacementFilter.uniforms.pan = [0.0, 0.0];
                window.displacementFilter.uniforms.offset = [0.0, 0.0];
                window.displacementFilter.uniforms.zoom = 1.0;
            }
            switch (menuID)
            {
            case "scaleDepth*2":
                adjustAllLevels(2.0, 0.0);
                break;
            case "scaleDepth*1.3":
                adjustAllLevels(1.3, 0.0);
                break;
            case "scaleDepth*1.1":
                adjustAllLevels(1.1, 0.0);
                break;
            case "scaleDepth/1.1":
                adjustAllLevels(1.0 / 1.1, 0.0);
                break;
            case "scaleDepth/1.3":
                adjustAllLevels(1.0 / 1.3, 0.0);
                break;
            case "scaleDepth/2":
                adjustAllLevels(0.5, 0.0);
                break;

            case "shiftDepth+25":
                adjustAllLevels(1.0, 25.0);
                break;
            case "shiftDepth+5":
                adjustAllLevels(1.0, 5.0);
                break;
            case "shiftDepth+1":
                adjustAllLevels(1.0, 1.0);
                break;
            case "shiftDepth-25":
                adjustAllLevels(1.0, -25.0);
                break;
            case "shiftDepth-5":
                adjustAllLevels(1.0, -5.0);
                break;
            case "shiftDepth-1":
                adjustAllLevels(1.0, -1.0);
                break;
            case "about":
                cep.util.openURLInDefaultBrowser("https://github.com/laplamgor/kantai3d-photoshop-extension");
                break;
            }
        }

        function changeDisplayMode(mode)
        {
            csInterface.updateContextMenuItem("basicTextureMode", true, false);
            csInterface.updateContextMenuItem("normalMapMode", true, false);
            csInterface.updateContextMenuItem("mixedMode", true, false);
            csInterface.updateContextMenuItem(mode, true, true);

            switch (mode)
            {
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
        function loadBaseImage()
        {
            csInterface.evalScript("app.activeDocument.fullName.fsName.replace(/\\\\/g, '/')", function (path)
            {
                if (path.toLowerCase().indexOf("_depth.psd") === -1)
                {
                    return; // Only generate PNG depth map if matching file name format
                }
                var url = path.replace('_depth', '').replace('.psd', '.png') + "?_=" + (new Date().getTime());
                var img = new Image();
                img.onload = function ()
                {
                    var baseTexture = new PIXI.BaseTexture(img);
                    var texture = new PIXI.Texture(baseTexture);
                    depthMapImage.setTexture(texture);

                    window.displacementFilter.uniforms.textureWidth = depthMapImage.texture.width;
                    window.displacementFilter.uniforms.textureHeight = depthMapImage.texture.height;

                    window.displacementFilter.uniforms.textureSize = [depthMapImage.texture.width, depthMapImage.texture.height];

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
            if (currentDepthPngPath.toLowerCase().indexOf("_depth.png") === -1)
            {
                return; // Only generate PNG depth map if matching file name format
            }
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

        function adjustAllLevels(multiplier, addition)
        {
            var reduction = 0.0;
            if (addition < 0)
            {
                reduction = -addition;
                addition = 0.0;
            }

            var fromStart = 0 + reduction;
            var fromEnd = 255 - addition;
            var toStart = 0 + addition;
            var toEnd = 255 - reduction;

            if (multiplier > 1.0)
            {
                var offset = Math.floor(127.0 / multiplier);
                fromStart = 127 - offset + reduction;
                fromEnd = 128 + offset - addition;
            }
            else
            {
                var offset = Math.floor(127.0 * multiplier);
                toStart = 127 - offset + addition;
                toEnd = 128 + offset - reduction;
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

            csInterface.evalScript(scriptScale, function (path)  {}
            );
        }
    }
    init();
}
    ());
