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

        var script = `
if (app.documents.length != 0) {
  var doc= app.activeDocument;

  var opts, file;
  opts = new ExportOptionsSaveForWeb();
  opts.format = SaveDocumentType.PNG;
  opts.quality = 100;

  pngFile = new File("` + csInterface.getSystemPath(SystemPath.EXTENSION) + `" + "/depth_preview.png");
  //pngFile = new File(app.activeDocument.path + "/depth_preview.png");
  app.activeDocument.exportDocument(pngFile, ExportType.SAVEFORWEB, opts);
}
            `;

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

vec4 textureDiffuse(vec2 coord) {
    vec2 c = coord;

    if (coord[0] <= 0.0 || coord[0] >= 1.0 || coord[1] <= 0.0 || coord[1] >= 1.0 || (texture2D(uSampler, c).a < 1.0))
    {
        return vec4(1.0, 0.0, 0.0, 1.0);
    }
    else
    {
        return texture2D(uSampler, c);
    }
}

vec4 textureDepth(vec2 coord) {
    vec2 c = coord;
    vec2 frame = vec2(frameWidth, frameHeight);
    vec2 tex = vec2(textureWidth, textureHeight);

    c = c  * frame  /  tex * textureScale ;
    c = c + vec2(max(pan[0], 0.0), max(pan[1], 0.0)) /  tex * textureScale ;

    c = c / zoom;
    if (c[0] <= 0.0 || c[0] >= 1.0 || c[1] <= 0.0 || c[1] >= 1.0)
    {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }
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

    if (texture2D(uSampler, coord)[3] < 1.0) {
        return vec4(0.0,0.0,0.0,0.0);
    }

    if (mod(coord[0], spaceW2) < lineW || mod(coord[1], spaceH2) < lineH)
    {
        return vec4(0.75,0.75,0.75,0.75);
    }
    if (mod(coord[0], spaceW) < lineW || mod(coord[1], spaceH) < lineH)
    {
        return vec4(0.5, 0.5, 0.5, 0.75);
    }
    return vec4(texture2D(displacementMap, mapCoord2(coord)).r);
}

vec4 normal(vec2 coord)
{
    vec2 lineW = vec2(0.5 / frameWidth / zoom, 0.0);
    vec2 lineH = vec2(0.0, 0.5 / frameHeight / zoom);


    float leftD = texture2D(displacementMap, mapCoord2(coord - lineW)).r;
    float rightD = texture2D(displacementMap, mapCoord2(coord + lineW)).r;
    float upD = texture2D(displacementMap, mapCoord2(coord - lineH)).r;
    float downD = texture2D(displacementMap, mapCoord2(coord + lineH)).r;

    if (texture2D(uSampler, coord)[3] < 1.0) {
        return vec4(0.0);
    }

    return vec4(0.5, 0.5, 1.0, 1.0) + vec4(leftD-rightD, upD-downD, 0.0, 0.0) * 100.0 * zoom;
}

vec4 normalMixed(vec2 coord)
{
    return textureDiffuse(coord)  - vec4(0.5,0.5,1.0,1.0) + normal(coord);
}

const float compression = 1.0;
const float dmin = 0.0;
const float dmax = 1.0;

// sqrt(2)
#define MAXOFFSETLENGTH 1.41421356
// 10 * 1.1
#define MAXZOOM 11.0

#define MAXSTEPS 600.0
float steps = max(MAXSTEPS *length(offset * zoom), 30.0);

void main(void)
{
    vec2 scale2 = scale * vec2(textureHeight / frameWidth , 
                       textureWidth / frameHeight ) 
                * vec2(1, -1);
    mat2 baseVector =
        mat2(vec2((0.5 - focus) * (offset * zoom) - (offset * zoom) / 2.0) * scale2,
             vec2((0.5 - focus) * (offset * zoom) + (offset * zoom) / 2.0) * scale2);


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
    if (displayMode == 0) {
        gl_FragColor = textureDiffuse(coord);
    } else if (displayMode == 1) {
        gl_FragColor = normalMixed(coord);
    } else {
        gl_FragColor = grid(coord);
    }

}
                `);

        PIXI.DepthPerspectiveFilter.apply = function (filterManager, input, output)
        {
            this.uniforms.dimensions = {};
            if (input && input.sourceFrame && input.size)
            {
                this.uniforms.dimensions[0] = input.sourceFrame.width;
                this.uniforms.dimensions[1] = input.sourceFrame.height;
                console.log(window.displacementFilter.uniforms.offset[1]);

                this.uniforms.frameWidth = input.size.width;
                this.uniforms.frameHeight = input.size.height;

                logo.position﻿.x = -this.uniforms.pan[0];
                logo.position﻿.y = -this.uniforms.pan[1];
            }

            this.uniforms.canvasSize = {};
            this.uniforms.canvasSize[0] = app.renderer.width;
            this.uniforms.canvasSize[1] = app.renderer.height;


            logo.scale.set(this.uniforms.zoom);


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

        var path = csInterface.getSystemPath(SystemPath.EXTENSION) + "/depth_preview.png";

        var result = window.cep.fs.readFile(path);

        if (result.err == 0)
        {
            //alert(result.data); // displays file content
        }
        else
        {
            alert("fail" + result.err);
        }

        //~/AppData/Local/Temp/depth_preview.png
        //http://192.168.1.245/3d.jpg`
        var logo = new PIXI.Sprite.fromImage(csInterface.getSystemPath(SystemPath.EXTENSION) + "/depth_preview.png");

        // window.displacementSprite = PIXI.Sprite.fromImage(csInterface.getSystemPath( SystemPath.EXTENSION ) + "/depth_preview.png");
        window.displacementFilter = PIXI.DepthPerspectiveFilter;

        window.displacementFilter.uniforms.textureWidth = logo.texture.width;
        window.displacementFilter.uniforms.textureHeight = logo.texture.height;
        window.displacementFilter.uniforms.textureScale = 1.0;
        window.displacementFilter.padding = 0;

        // window.displacementSprite.visible = false;

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
                window.displacementFilter.uniforms.displayMode++;
                window.displacementFilter.uniforms.displayMode %= 3;
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
                    window.displacementFilter.uniforms.pan[0] += app.renderer.plugins.interaction.mouse.global.x;
                    window.displacementFilter.uniforms.pan[0] *= 1.1;
                    window.displacementFilter.uniforms.pan[0] -= app.renderer.plugins.interaction.mouse.global.x;
                    window.displacementFilter.uniforms.pan[1] += app.renderer.plugins.interaction.mouse.global.y;
                    window.displacementFilter.uniforms.pan[1] *= 1.1;
                    window.displacementFilter.uniforms.pan[1] -= app.renderer.plugins.interaction.mouse.global.y;
                }
            }
            else
            {
                window.displacementFilter.uniforms.zoom /= 1.1;
                window.displacementFilter.uniforms.pan[0] = (window.displacementFilter.uniforms.pan[0] + app.renderer.plugins.interaction.mouse.global.x) / 1.1 - app.renderer.plugins.interaction.mouse.global.x;
                window.displacementFilter.uniforms.pan[1] = (window.displacementFilter.uniforms.pan[1] + app.renderer.plugins.interaction.mouse.global.y) / 1.1 - app.renderer.plugins.interaction.mouse.global.y;
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
                    window.displacementFilter.uniforms.offset[0] -= ((endx - tiltX) / logo.texture.width * 2);
                    window.displacementFilter.uniforms.offset[1] += ((endy - tiltY) / logo.texture.height * 2);

                    window.displacementFilter.uniforms.offset[0] =
                        Math.max(Math.min(window.displacementFilter.uniforms.offset[0], 1.0), -1.0);
                    window.displacementFilter.uniforms.offset[1] =
                        Math.max(Math.min(window.displacementFilter.uniforms.offset[1], 1.0), -1.0);

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
        }

        resize();

        // Load the image as the default
        csInterface.evalScript("app.activeDocument.fullName.parent.fsName.replace(/\\\\/g, '/')", function (path)
        {
            var url = path + "/base_preview.png?_=" + (new Date().getTime());
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
        }
        );

        csInterface.evalScript(`stringIDToTypeID( "toolModalStateChanged" )`, function (id)
        {
            register(id); // toolModalStateChanged, almost everything
            register(1936483188); // 'slct' (e.g. change history state)
            register(1399355168); // 'Shw' (show layer)
            register(1214521376); // 'Hd  ' (hide layer)
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
            // alert(csEvent.data);
            // try
            // {
            //     if (typeof csEvent.data === "string")
            //     {
            //         var eventData = csEvent.data.replace("ver1,{", "{");
            //         var eventDataObject = JSON.parse(eventData);
            //         csEvent.data = eventDataObject;
            //     }
            // }
            // catch (e)
            // {
            //     console.log("PhotoshopCallbackUnique catch: " + e);
            // }

            // if (csEvent.data && csEvent.data.eventID == 1936483188 && csEvent.data.eventData.null._ref == 'historyState') {
            //     alert(csEvent.data.eventID);
            // }
            updatePreview();
        }

        function updatePreview()
        {
            csInterface.evalScript(script, function (res)
            {
                var u = csInterface.getSystemPath(SystemPath.EXTENSION) + "/depth_preview.png?_=" + (new Date().getTime());
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

    }
    init();
}
    ());
