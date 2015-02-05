(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Away3DDataVisView = require("./away3d/Away3DDataVisView");
var WorldData = require("./data/WorldData");
var WorldDataEvent = require("./data/WorldDataEvent");
var GlobeFacade = (function () {
    /**
     * Constructor
     */
    function GlobeFacade() {
    }
    /**
     */
    GlobeFacade.prototype.init = function (canvasTargetName, handSet, viewType, highValue) {
        var _this = this;
        this._canvasTargetName = canvasTargetName;
        this._handSet = handSet;
        this._viewType = viewType;
        this._highValue = highValue;
        this._worldData = new WorldData();
        this._worldData.addEventListener(WorldDataEvent.LOADED, function (event) { return _this.onCountryLoaded(event); });
        this._worldData.addEventListener(WorldDataEvent.NO_COUNTRY_DATA, function (event) { return _this.onNoCountryLoaded(event); });
        this._worldData.addEventListener(WorldDataEvent.NO_VENDOR_DATA, function (event) { return _this.onNoVendorLoaded(event); });
        this.loadViewData();
    };
    GlobeFacade.prototype.loadViewData = function () {
        this._worldData.load(this._viewType, this._handSet, this._timeType);
    };
    GlobeFacade.prototype.onNoVendorLoaded = function (event) {
        console.warn("Nothing vendor data");
        this.showData(event.data);
    };
    GlobeFacade.prototype.onNoCountryLoaded = function (event) {
        console.warn("No country data");
        this.showData(event.data, true);
    };
    GlobeFacade.prototype.onCountryLoaded = function (event) {
        if (!this._dataVisSphere) {
            this._dataVisSphere = new Away3DDataVisView(this._canvasTargetName);
            this._dataVisSphere.hour = this._hour;
            this._dataVisSphere.autoCycleTime = this._autoCycleTime;
            this._dataVisSphere.autoRotate = this._autoRotate;
        }
        this.showData(event.data);
    };
    GlobeFacade.prototype.showData = function (data, forceGlobalView) {
        if (forceGlobalView === void 0) { forceGlobalView = false; }
        if (this._viewType == "0" || forceGlobalView) {
            this._dataVisSphere.setGlobalData(data);
            this._dataVisSphere.showGlobalView();
        }
        else {
            this._dataVisSphere.showLocalView(data);
        }
    };
    GlobeFacade.prototype.setViewType = function (value, highValue) {
        if (this._viewType == value)
            return;
        this._viewType = value;
        this._highValue = highValue;
        this.loadViewData();
    };
    GlobeFacade.prototype.setTimeType = function (value) {
        if (this._timeType == value)
            return;
        this._timeType = value;
        this.loadViewData();
    };
    GlobeFacade.prototype.setHandSet = function (value) {
        if (this._handSet == value)
            return;
        this._handSet = value;
        this.loadViewData();
    };
    GlobeFacade.prototype.setTimelineRatio = function (t) {
        this._hour = t * 24;
        if (this._dataVisSphere)
            this._dataVisSphere.hour = this._hour;
    };
    GlobeFacade.prototype.setAutoCycleTime = function (value) {
        this._autoCycleTime = value;
        if (this._dataVisSphere)
            this._dataVisSphere.autoCycleTime = value;
    };
    GlobeFacade.prototype.setAutoRotate = function (value) {
        this._autoRotate = value;
        if (this._dataVisSphere)
            this._dataVisSphere.autoRotate = value;
    };
    return GlobeFacade;
})();
window.onload = function () {
    // HACK, to fix
    window["globeFacade"] = new GlobeFacade();
};


},{"./away3d/Away3DDataVisView":2,"./data/WorldData":20,"./data/WorldDataEvent":22}],2:[function(require,module,exports){
var Vector3D = require("awayjs-core/lib/geom/Vector3D");
var RequestAnimationFrame = require("awayjs-core/lib/utils/RequestAnimationFrame");
var PerspectiveProjection = require("awayjs-core/lib/projections/PerspectiveProjection");
var View = require("awayjs-display/lib/containers/View");
var ImageTexture = require("awayjs-core/lib/textures/ImageTexture");
var PrimitiveSpherePrefab = require("awayjs-display/lib/prefabs/PrimitiveSpherePrefab");
var PrimitivePlanePrefab = require("awayjs-display/lib/prefabs/PrimitivePlanePrefab");
var DataVisMaterial = require("./rendering/DataVisMaterial");
var HaloMaterial = require("./rendering/HaloMaterial");
var GLSLRenderer = require("./glsl/GLSLRenderer");
var StageHack = require("./glsl/StageHack");
var DataVisRenderable = require("./geometry/DataVisRenderable");
var ConeDataShape = require("./geometry/ConeDataShape");
var RotationController = require("./RotationController");
var Away3DDataVisView = (function () {
    function Away3DDataVisView(divID) {
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._defaultGlobalCamDistance = 80;
        this._localDataVisRenderable = null;
        this._rotationSpeed = .02; // degrees / ms
        this._autoRotate = false;
        this._autoCycleTime = false;
        this._autoCycleTimeSpeed = 1 / 4000; // h / ms
        this._viewTypeInertia = .93;
        this._sphereRadius = 30;
        this._zoomInitFingerDistance = 0;
        this._refZoomDistance = 0;
        this._minDistance = 40;
        this._maxDistance = 200;
        // this is NOT the same as the pivot point!
        this._lookAtTarget = new Vector3D();
        this._canvasContainer = document.getElementById(divID);
        this.initEngine();
        this.initObject();
        this.initListeners();
    }
    Object.defineProperty(Away3DDataVisView.prototype, "autoRotate", {
        get: function () {
            return this._autoRotate;
        },
        set: function (value) {
            this._autoRotate = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Away3DDataVisView.prototype, "autoRotateSpeed", {
        get: function () {
            return this._rotationSpeed;
        },
        set: function (value) {
            this._rotationSpeed = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Away3DDataVisView.prototype, "autoCycleTime", {
        // does this belong here, really? I suppose it will also involve updating the UI hour indicator?
        get: function () {
            return this._autoCycleTime;
        },
        set: function (value) {
            this._autoCycleTime = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Away3DDataVisView.prototype, "autoCycleTimeSpeed", {
        get: function () {
            return this._autoCycleTimeSpeed;
        },
        set: function (value) {
            this._autoCycleTimeSpeed = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Away3DDataVisView.prototype, "hour", {
        get: function () {
            return this._dataVisMaterial.hour;
        },
        set: function (value) {
            this._dataVisMaterial.hour = value;
        },
        enumerable: true,
        configurable: true
    });
    Away3DDataVisView.prototype.initEngine = function () {
        StageHack.INIT();
        //create the view
        this._view = new View(new GLSLRenderer());
        this._view.backgroundColor = 0x202020;
        var child = this._view["_htmlElement"];
        document.body.removeChild(child);
        this._canvasContainer.appendChild(child);
        //create custom lens
        this._view.camera.projection = new PerspectiveProjection(70);
        this._view.camera.projection.far = 5000;
        this._view.camera.projection.near = 1;
        //setup controller to be used on the camera
        this._cameraController = new RotationController(this._view.camera);
        this._cameraController.latitude = 0;
        this._cameraController.longitude = 0;
        this._cameraController.autoUpdate = false;
        this._targetCamDistance = this._cameraController.distance = this._defaultGlobalCamDistance;
        this._lookAtTarget.x = 0;
        this._lookAtTarget.y = 0;
        this._lookAtTarget.z = 0;
    };
    Away3DDataVisView.prototype.getURLParameter = function (name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
    };
    /**
     * Sets the global data. Required!
     */
    Away3DDataVisView.prototype.setGlobalData = function (data) {
        if (this._globalDataVisRenderable)
            this._globalDataVisRenderable.dispose();
        this._globalDataVisRenderable = this.createDataVisRenderable(data);
        this._globalMaxValue = data.maxElementValue;
        this._dataVisMaterial.dataVisRenderable = this._globalDataVisRenderable;
        this._dataVisMaterial.maxValue = this._globalMaxValue;
    };
    /**
     * Focuses on a more local view (fe: country)
     */
    Away3DDataVisView.prototype.showLocalView = function (data) {
        if (this._localDataVisRenderable)
            this._localDataVisRenderable.dispose();
        this._localDataVisRenderable = this.createDataVisRenderable(data, .2);
        this._dataVisMaterial.dataVisRenderable = this._localDataVisRenderable;
        this._dataVisMaterial.maxValue = data.maxElementValue;
        this.focusCameraOnLocal();
    };
    Away3DDataVisView.prototype.createDataVisRenderable = function (data, radius, heightRatio) {
        if (radius === void 0) { radius = .5; }
        if (heightRatio === void 0) { heightRatio = 10; }
        return new DataVisRenderable(data, new ConeDataShape(radius, radius * heightRatio, 10));
    };
    Away3DDataVisView.prototype.showGlobalView = function () {
        this._dataVisMaterial.dataVisRenderable = this._globalDataVisRenderable;
        this._dataVisMaterial.maxValue = this._globalMaxValue;
        if (this._localDataVisRenderable) {
            this._localDataVisRenderable.dispose();
            this._localDataVisRenderable = null;
        }
        this._targetCamDistance = this._defaultGlobalCamDistance;
    };
    Object.defineProperty(Away3DDataVisView.prototype, "isInLocalView", {
        get: function () {
            return this._localDataVisRenderable != null;
        },
        enumerable: true,
        configurable: true
    });
    Away3DDataVisView.prototype.initObject = function () {
        var sphere = new PrimitiveSpherePrefab(this._sphereRadius / 3.0, 32, 24);
        var mesh = sphere.getNewObject();
        var image = document.getElementById("mapImage");
        var gradient = this.getURLParameter("gradient");
        mesh.material = this._dataVisMaterial = new DataVisMaterial(gradient == "1" || gradient == "true");
        this._dataVisMaterial.texture = new ImageTexture(image, false);
        var color = this.getURLParameter("minColor");
        if (color)
            this._dataVisMaterial.minColor = parseInt("0x" + color);
        if (color)
            this._dataVisMaterial.maxColor = parseInt("0x" + this.getURLParameter("maxColor"));
        mesh.scaleX = mesh.scaleY = mesh.scaleZ = 3.0;
        this._view.scene.addChild(mesh);
        var plane = new PrimitivePlanePrefab(this._sphereRadius * 2.25, this._sphereRadius * 2.25, 1, 1, false, true);
        this._haloMesh = plane.getNewObject();
        var image = document.getElementById("haloImage");
        this._haloMesh.material = new HaloMaterial(new ImageTexture(image, false));
        this._view.scene.addChild(this._haloMesh);
    };
    Away3DDataVisView.prototype.focusCameraOnLocal = function () {
        var subRenderable = this._localDataVisRenderable.getSubRenderable(0);
        var minLat = subRenderable.minLat;
        var maxLat = subRenderable.maxLat;
        var minLong = subRenderable.minLong;
        var maxLong = subRenderable.maxLong;
        var len = this._localDataVisRenderable.numSubRenderables;
        for (var i = 1; i < len; ++i) {
            subRenderable = this._localDataVisRenderable.getSubRenderable(i);
            minLat = Math.min(subRenderable.minLat, minLat);
            maxLat = Math.max(subRenderable.maxLat, maxLat);
            minLong = Math.min(subRenderable.minLong, minLong);
            maxLong = Math.max(subRenderable.maxLong, maxLong);
        }
        var focusLong = (minLong + maxLong) * .5;
        var focusLat = (minLat + maxLat) * .5;
        // assuming there is no country that spans over half of the world in longitude ;)
        // NO, NOT EVEN YOU, RUSSIA!
        if (maxLong - minLong > 180)
            focusLong = 180 + focusLong;
        // TODO: use angular distance of lat/long bounds to know how far we can zoom
        var radX = focusLat * Math.PI / 180;
        var radY = focusLong * Math.PI / 180;
        var sinX = Math.sin(radX);
        var cosX = Math.cos(radX);
        var sinY = Math.sin(radY);
        var cosY = Math.cos(radY);
        var avgX = -sinY * cosX * this._sphereRadius;
        var avgY = -sinX * this._sphereRadius;
        var avgZ = cosY * cosX * this._sphereRadius;
        this._targetLocalLong = focusLong - 5;
        this._targetLocalLat = focusLat + 5;
        this._targetCamDistance = 40;
        this._lookAtTarget.x = avgX;
        this._lookAtTarget.y = avgY;
        this._lookAtTarget.z = avgZ;
    };
    /**
     * Initialise the listeners
     */
    Away3DDataVisView.prototype.initListeners = function () {
        var _this = this;
        window.onresize = function (event) { return _this.onResize(event); };
        this._canvasContainer.onmousedown = function (event) { return _this.onMouseDown(event); };
        this._canvasContainer.onmouseup = function (event) { return _this.onMouseUp(event); };
        this._canvasContainer.onmousemove = function (event) { return _this.onMouseMove(event); };
        var self = this;
        // some messy stuff because there's actually no ontouchstart etc properties?
        this._canvasContainer.addEventListener('touchstart', onTouchStart, false);
        this._canvasContainer.addEventListener('touchend', onTouchEnd, false);
        this._canvasContainer.addEventListener('touchmove', onTouchMove, false);
        function onTouchStart(event) {
            if (this.isInLocalView)
                return;
            event.preventDefault();
            event.stopPropagation();
            this._move = false;
            this._zoom = false;
            switch (event.touches.length) {
                case 1:
                    self._move = true;
                    self._lastLongitude = self._cameraController.longitude;
                    self._lastLatitude = self._cameraController.latitude;
                    self._lastMouseX = event.touches[0].pageX;
                    self._lastMouseY = event.touches[0].pageY;
                    break;
                case 2:
                    self._zoom = true;
                    var dx = event.touches[0].pageX - event.touches[1].pageX;
                    var dy = event.touches[0].pageY - event.touches[1].pageY;
                    self._zoomInitFingerDistance = Math.sqrt(dx * dx + dy * dy);
                    self._refZoomDistance = self._cameraController.distance;
                    break;
            }
        }
        function onTouchEnd(event) {
            event.preventDefault();
            event.stopPropagation();
            self._move = false;
            self._zoom = false;
        }
        function onTouchMove(event) {
            event.preventDefault();
            event.stopPropagation();
            switch (event.touches.length) {
                case 1:
                    if (self._move) {
                        self._cameraController.longitude = -0.3 * (event.touches[0].pageX - self._lastMouseX) + self._lastLongitude;
                        self._cameraController.latitude = -0.3 * (event.touches[0].pageY - self._lastMouseY) + self._lastLatitude;
                    }
                    break;
                case 2:
                    if (self._zoom) {
                        var dx = event.touches[0].pageX - event.touches[1].pageX;
                        var dy = event.touches[0].pageY - event.touches[1].pageY;
                        var distance = Math.sqrt(dx * dx + dy * dy);
                        self._targetCamDistance = self._cameraController.distance = Math.min(Math.max(self._refZoomDistance / distance * self._zoomInitFingerDistance, self._minDistance), self._maxDistance);
                    }
                    break;
            }
        }
        this.onResize();
        this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
        this._timer.start();
    };
    /**
     * Render loop
     */
    Away3DDataVisView.prototype.onEnterFrame = function (dt) {
        var controllerLookAt = this._cameraController.lookAtTarget;
        if (!this.isInLocalView) {
            //update camera controler
            if (this._autoRotate)
                this._cameraController.longitude += dt * this._rotationSpeed;
            // reset to 0 tilt
            //this._cameraController.latitude *= .75;
            controllerLookAt.x *= .75;
            controllerLookAt.y *= .75;
            controllerLookAt.z *= .75;
        }
        else {
            this._cameraController.latitude = this._cameraController.latitude * this._viewTypeInertia + this._targetLocalLat * (1.0 - this._viewTypeInertia);
            this._cameraController.longitude = this._cameraController.longitude * this._viewTypeInertia + this._targetLocalLong * (1.0 - this._viewTypeInertia);
            controllerLookAt.x = controllerLookAt.x * this._viewTypeInertia + this._lookAtTarget.x * (1.0 - this._viewTypeInertia);
            controllerLookAt.y = controllerLookAt.y * this._viewTypeInertia + this._lookAtTarget.y * (1.0 - this._viewTypeInertia);
            controllerLookAt.z = controllerLookAt.z * this._viewTypeInertia + this._lookAtTarget.z * (1.0 - this._viewTypeInertia);
        }
        //this._cameraController.latitude = 50;
        //this._cameraController.longitude = 50;
        this._cameraController.distance = this._cameraController.distance * this._viewTypeInertia + this._targetCamDistance * (1.0 - this._viewTypeInertia);
        this._cameraController.update();
        this._haloMesh.lookAt(this._view.camera.scenePosition);
        if (this._autoCycleTime) {
            this._dataVisMaterial.hour += dt * this._autoCycleTimeSpeed;
            while (this._dataVisMaterial.hour > 24) {
                this._dataVisMaterial.hour -= 24;
            }
        }
        //update view
        this._view.render();
    };
    /**
     * Mouse down listener for navigation
     */
    Away3DDataVisView.prototype.onMouseDown = function (event) {
        if (this.isInLocalView)
            return;
        this._lastLongitude = this._cameraController.longitude;
        this._lastLatitude = this._cameraController.latitude;
        this._lastMouseX = event.pageX;
        this._lastMouseY = event.pageY;
        this._move = true;
    };
    /**
     * Mouse up listener for navigation
     */
    Away3DDataVisView.prototype.onMouseUp = function (event) {
        this._move = false;
    };
    Away3DDataVisView.prototype.onMouseMove = function (event) {
        if (this._move) {
            this._cameraController.longitude = -0.3 * (event.pageX - this._lastMouseX) + this._lastLongitude;
            this._cameraController.latitude = -0.3 * (event.pageY - this._lastMouseY) + this._lastLatitude;
        }
    };
    /**
     * Mouse wheel listener for navigation
     */
    /*private onMouseWheel(event):void
    {
        if (this.isInLocalView) return;

        this._targetCamDistance -= event.wheelDelta * 5;

        if (this._targetCamDistance < 100)
            this._targetCamDistance = 100;
        else if (this._cameraController.distance > 2000)
            this._targetCamDistance = 2000;
    }*/
    /**
     * window listener for resize events
     */
    Away3DDataVisView.prototype.onResize = function (event) {
        if (event === void 0) { event = null; }
        this._view.y = 0;
        this._view.x = 0;
        this._view.width = window.innerWidth;
        this._view.height = window.innerHeight - 100;
    };
    return Away3DDataVisView;
})();
module.exports = Away3DDataVisView;


},{"./RotationController":3,"./geometry/ConeDataShape":4,"./geometry/DataVisRenderable":5,"./glsl/GLSLRenderer":11,"./glsl/StageHack":14,"./rendering/DataVisMaterial":15,"./rendering/HaloMaterial":18,"awayjs-core/lib/geom/Vector3D":undefined,"awayjs-core/lib/projections/PerspectiveProjection":undefined,"awayjs-core/lib/textures/ImageTexture":undefined,"awayjs-core/lib/utils/RequestAnimationFrame":undefined,"awayjs-display/lib/containers/View":undefined,"awayjs-display/lib/prefabs/PrimitivePlanePrefab":undefined,"awayjs-display/lib/prefabs/PrimitiveSpherePrefab":undefined}],3:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Vector3D = require("awayjs-core/lib/geom/Vector3D");
var ControllerBase = require("awayjs-display/lib/controllers/ControllerBase");
/**
 * Basically the hover controller but to correspond correctly to the lat/long calculations
 *
 * @see    away.containers.View
 */
var RotationController = (function (_super) {
    __extends(RotationController, _super);
    /**
     * Creates a new <code>HoverController</code> object.
     */
    function RotationController(targetObject) {
        if (targetObject === void 0) { targetObject = null; }
        _super.call(this, targetObject);
        this._iCurrentLong = 0;
        this._iCurrentLat = 90;
        this._longitude = 0;
        this._latitude = 90;
        this._distance = 1000;
        this._steps = 8;
        this._wrapLongitude = false;
        this._lookAtTarget = new Vector3D(0, 0, 0, 1);
        //values passed in contrustor are applied immediately
        this._iCurrentLong = this._longitude;
        this._iCurrentLat = this._latitude;
    }
    Object.defineProperty(RotationController.prototype, "lookAtTarget", {
        get: function () {
            return this._lookAtTarget;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RotationController.prototype, "steps", {
        get: function () {
            return this._steps;
        },
        set: function (val) {
            val = (val < 1) ? 1 : val;
            if (this._steps == val)
                return;
            this._steps = val;
            this.pNotifyUpdate();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RotationController.prototype, "longitude", {
        /**
         * Rotation of the camera in degrees around the y axis. Defaults to 0.
         */
        get: function () {
            return this._longitude;
        },
        set: function (val) {
            if (this._longitude == val)
                return;
            this._longitude = val;
            this.pNotifyUpdate();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RotationController.prototype, "latitude", {
        /**
         * Elevation angle of the camera in degrees. Defaults to 90.
         */
        get: function () {
            return this._latitude;
        },
        set: function (val) {
            if (val < -90)
                val = -90;
            else if (val > 90)
                val = 90;
            if (this._latitude == val)
                return;
            this._latitude = val;
            this.pNotifyUpdate();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RotationController.prototype, "distance", {
        /**
         * Distance between the camera and the specified target. Defaults to 1000.
         */
        get: function () {
            return this._distance;
        },
        set: function (val) {
            if (this._distance == val)
                return;
            this._distance = val;
            this.pNotifyUpdate();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RotationController.prototype, "wrapLongitude", {
        /**
         * Defines whether the value of the pan angle wraps when over 360 degrees or under 0 degrees. Defaults to false.
         */
        get: function () {
            return this._wrapLongitude;
        },
        set: function (val) {
            if (this._wrapLongitude == val)
                return;
            this._wrapLongitude = val;
            this.pNotifyUpdate();
        },
        enumerable: true,
        configurable: true
    });
    RotationController.prototype.update = function (interpolate) {
        if (interpolate === void 0) { interpolate = true; }
        if (this._latitude != this._iCurrentLat || this._longitude != this._iCurrentLong) {
            this.pNotifyUpdate();
            if (this._wrapLongitude) {
                if (this._longitude < 0) {
                    this._iCurrentLong += this._longitude % 360 + 360 - this._longitude;
                    this._longitude = this._longitude % 360 + 360;
                }
                else {
                    this._iCurrentLong += this._longitude % 360 - this._longitude;
                    this._longitude = this._longitude % 360;
                }
                while (this._longitude - this._iCurrentLong < -180)
                    this._iCurrentLong -= 360;
                while (this._longitude - this._iCurrentLong > 180)
                    this._iCurrentLong += 360;
            }
            if (interpolate) {
                this._iCurrentLat += (this._latitude - this._iCurrentLat) / (this.steps + 1);
                this._iCurrentLong += (this._longitude - this._iCurrentLong) / (this.steps + 1);
            }
            else {
                this._iCurrentLong = this._longitude;
                this._iCurrentLat = this._latitude;
            }
            //snap coords if angle differences are close
            if ((Math.abs(this._latitude - this._iCurrentLat) < 0.01) && (Math.abs(this._longitude - this._iCurrentLong) < 0.01)) {
                this._iCurrentLat = this._latitude;
                this._iCurrentLong = this._longitude;
            }
        }
        var radX = this._iCurrentLat * Math.PI / 180.0;
        var radY = this._iCurrentLong * Math.PI / 180.0;
        var sinX = Math.sin(radX);
        var cosX = Math.cos(radX);
        var sinY = Math.sin(radY);
        var cosY = Math.cos(radY);
        var zAxisX = -sinY * cosX;
        var zAxisY = -sinX;
        var zAxisZ = cosY * cosX;
        this._pTargetObject.transform.position = new Vector3D(zAxisX * this._distance, zAxisY * this._distance, zAxisZ * this._distance);
        this._pTargetObject.lookAt(this._lookAtTarget);
    };
    return RotationController;
})(ControllerBase);
module.exports = RotationController;


},{"awayjs-core/lib/geom/Vector3D":undefined,"awayjs-display/lib/controllers/ControllerBase":undefined}],4:[function(require,module,exports){
var ConeDataShape = (function () {
    function ConeDataShape(radius, height, numSegments) {
        radius = radius || .5;
        height = height || 1;
        numSegments = numSegments || 5;
        this.vertices = [0.0, 0.0, height];
        this.indices = [];
        var baseIndex = 1;
        var segmentRad = Math.PI * 2.0 / numSegments;
        for (var i = 0; i < numSegments; ++i) {
            var angle = segmentRad * i;
            this.vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.0);
            if (i == numSegments - 1)
                this.indices.push(0, baseIndex, 1);
            else
                this.indices.push(0, baseIndex, baseIndex + 1);
            ++baseIndex;
        }
    }
    return ConeDataShape;
})();
module.exports = ConeDataShape;


},{}],5:[function(require,module,exports){
var DataVisSubRenderable = require("./DataVisSubRenderable");
var PyramidDataShape = require("./PyramidDataShape");
var DataVisRenderable = (function () {
    function DataVisRenderable(dataPoints, baseShape) {
        this.init(dataPoints, baseShape || new PyramidDataShape());
    }
    Object.defineProperty(DataVisRenderable.prototype, "numSubRenderables", {
        get: function () {
            return this._subRenderables.length;
        },
        enumerable: true,
        configurable: true
    });
    DataVisRenderable.prototype.getSubRenderable = function (index) {
        return this._subRenderables[index];
    };
    DataVisRenderable.prototype.init = function (dataPoints, baseShape) {
        // need to split data points, so there's not more than 2^16 vertices
        var baseVertices = baseShape.vertices.length;
        var maxPoints = Math.floor(65535 / baseVertices);
        var numDataPoints = dataPoints.elements.length;
        this._subRenderables = [];
        if (numDataPoints < maxPoints) {
            this.addSubRenderable(dataPoints, 0, numDataPoints, baseShape);
        }
        else {
            for (var i = 0; i < numDataPoints; i += maxPoints) {
                this.addSubRenderable(dataPoints, i, i + maxPoints, baseShape);
            }
        }
    };
    DataVisRenderable.prototype.addSubRenderable = function (dataPoints, start, end, baseShape) {
        this._subRenderables.push(new DataVisSubRenderable(dataPoints, start, end, baseShape));
    };
    DataVisRenderable.prototype.dispose = function () {
        var len = this._subRenderables.length;
        for (var i = 0; i < len; ++i) {
            this._subRenderables[i].dispose();
        }
    };
    return DataVisRenderable;
})();
module.exports = DataVisRenderable;


},{"./DataVisSubRenderable":6,"./PyramidDataShape":7}],6:[function(require,module,exports){
var PyramidDataShape = require("./PyramidDataShape");
var DataVisSubRenderable = (function () {
    function DataVisSubRenderable(dataPoints, startPoint, endPoint, baseShape) {
        this.init(dataPoints, baseShape || new PyramidDataShape(), startPoint, endPoint);
    }
    Object.defineProperty(DataVisSubRenderable.prototype, "minLat", {
        get: function () {
            return this._minLat;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisSubRenderable.prototype, "maxLat", {
        get: function () {
            return this._maxLat;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisSubRenderable.prototype, "minLong", {
        get: function () {
            return this._minLong;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisSubRenderable.prototype, "maxLong", {
        get: function () {
            return this._maxLong;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisSubRenderable.prototype, "numTriangles", {
        get: function () {
            return this._numTriangles;
        },
        enumerable: true,
        configurable: true
    });
    DataVisSubRenderable.prototype.dispose = function () {
        if (this._indexBuffer)
            this._gl.deleteBuffer(this._indexBuffer);
        if (this._vertexPositionBuffer)
            this._gl.deleteBuffer(this._vertexPositionBuffer);
        if (this._vertexHourlyBuffer)
            this._gl.deleteBuffer(this._vertexHourlyBuffer);
        this._indexBuffer = null;
        this._vertexPositionBuffer = null;
        this._vertexHourlyBuffer = null;
    };
    DataVisSubRenderable.prototype.getVertexPositionBuffer = function (gl) {
        this._gl = gl;
        if (!this._vertexPositionBuffer) {
            this._vertexPositionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this._vertexPositionData, gl.STATIC_DRAW);
            this._vertexPositionData = null;
        }
        return this._vertexPositionBuffer;
    };
    DataVisSubRenderable.prototype.getVertexHourlyBuffer = function (gl) {
        this._gl = gl;
        if (!this._vertexHourlyBuffer) {
            this._vertexHourlyBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexHourlyBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this._vertexHourlyData, gl.STATIC_DRAW);
            this._vertexHourlyData = null;
        }
        return this._vertexHourlyBuffer;
    };
    DataVisSubRenderable.prototype.getIndexBuffer = function (gl) {
        if (!this._indexBuffer) {
            this._indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indexData, gl.STATIC_DRAW);
            this._indexData = null;
        }
        return this._indexBuffer;
    };
    // this is most likely going to be an array of structs
    DataVisSubRenderable.prototype.init = function (dataSet, baseShape, startPoint, endPoint) {
        var dataPoints = dataSet.elements;
        var numPoints = dataPoints.length;
        if (numPoints == 0) {
            this._numTriangles = 0;
            return;
        }
        if (numPoints < endPoint)
            endPoint = numPoints;
        var baseIndices = baseShape.indices;
        var baseVertices = baseShape.vertices;
        var numBaseIndices = baseIndices.length;
        var numBaseVertices = baseVertices.length;
        numPoints = endPoint - startPoint;
        var vertexPositionData = this._vertexPositionData = new Float32Array(numPoints * numBaseVertices * 5);
        var vertexHourlyData = this._vertexHourlyData = new Float32Array(numPoints * numBaseVertices * 24);
        var indexData = this._indexData = new Uint16Array(numPoints * numBaseIndices);
        var vertexPosCounter = 0;
        var vertexHourCounter = 0;
        var indexCounter = 0;
        var indexOffset = 0;
        this._maxLat = this._minLat = dataPoints[0].latitude;
        this._maxLong = this._minLong = dataPoints[0].longitude;
        for (var i = startPoint; i < endPoint; ++i) {
            var dataPoint = dataPoints[i];
            var values = dataPoint.hourlyValues;
            var lat = dataPoint.latitude;
            var long = dataPoint.longitude;
            var j = 0;
            // find bounds:
            if (lat < this._minLat)
                this._minLat = lat;
            if (lat > this._maxLat)
                this._maxLat = lat;
            if (long < this._minLong)
                this._minLong = long;
            if (long > this._maxLong)
                this._maxLong = long;
            lat *= Math.PI / 180.0;
            long *= Math.PI / 180.0;
            while (j < numBaseVertices) {
                vertexPositionData[vertexPosCounter++] = baseVertices[j++];
                vertexPositionData[vertexPosCounter++] = baseVertices[j++];
                vertexPositionData[vertexPosCounter++] = baseVertices[j++];
                vertexPositionData[vertexPosCounter++] = lat;
                vertexPositionData[vertexPosCounter++] = long;
                for (var h = 0; h < 24; ++h) {
                    vertexHourlyData[vertexHourCounter++] = values[h];
                }
            }
            for (j = 0; j < numBaseIndices; ++j) {
                indexData[indexCounter++] = indexOffset + baseIndices[j];
            }
            indexOffset += numBaseVertices / 3;
        }
        this._numTriangles = indexData.length / 3;
    };
    return DataVisSubRenderable;
})();
module.exports = DataVisSubRenderable;


},{"./PyramidDataShape":7}],7:[function(require,module,exports){
var PyramidDataShape = (function () {
    function PyramidDataShape() {
        this.vertices = [
            -.5,
            -.5,
            0.0,
            .5,
            -.5,
            0.0,
            .5,
            .5,
            0.0,
            -.5,
            .5,
            0.0,
            0,
            0,
            1.0
        ];
        this.indices = [
            0,
            1,
            4,
            1,
            2,
            4,
            2,
            3,
            4,
            3,
            0,
            4
        ];
    }
    return PyramidDataShape;
})();
module.exports = PyramidDataShape;


},{}],8:[function(require,module,exports){
var Rectangle = require("awayjs-core/lib/geom/Rectangle");
var ByteArray = require("awayjs-core/lib/utils/ByteArray");
var ContextGLBlendFactor = require("awayjs-stagegl/lib/base/ContextGLBlendFactor");
var ContextGLClearMask = require("awayjs-stagegl/lib/base/ContextGLClearMask");
var ContextGLCompareMode = require("awayjs-stagegl/lib/base/ContextGLCompareMode");
var ContextGLMipFilter = require("awayjs-stagegl/lib/base/ContextGLMipFilter");
var ContextGLProgramType = require("awayjs-stagegl/lib/base/ContextGLProgramType");
var ContextGLTextureFilter = require("awayjs-stagegl/lib/base/ContextGLTextureFilter");
var ContextGLTriangleFace = require("awayjs-stagegl/lib/base/ContextGLTriangleFace");
var ContextGLVertexBufferFormat = require("awayjs-stagegl/lib/base/ContextGLVertexBufferFormat");
var ContextGLWrapMode = require("awayjs-stagegl/lib/base/ContextGLWrapMode");
var CubeTextureWebGL = require("awayjs-stagegl/lib/base/CubeTextureWebGL");
var IndexBufferWebGL = require("awayjs-stagegl/lib/base/IndexBufferWebGL");
var TextureWebGL = require("awayjs-stagegl/lib/base/TextureWebGL");
var SamplerState = require("awayjs-stagegl/lib/base/SamplerState");
var VertexBufferWebGL = require("awayjs-stagegl/lib/base/VertexBufferWebGL");
var ProgramGLSL = require("./ProgramGLSL");
var ContextGLSL = (function () {
    function ContextGLSL(canvas) {
        this._blendFactorDictionary = new Object();
        this._depthTestDictionary = new Object();
        this._textureIndexDictionary = new Array(8);
        this._textureTypeDictionary = new Object();
        this._wrapDictionary = new Object();
        this._filterDictionary = new Object();
        this._mipmapFilterDictionary = new Object();
        this._uniformLocationNameDictionary = new Object();
        this._vertexBufferDimensionDictionary = new Object();
        this._indexBufferList = new Array();
        this._vertexBufferList = new Array();
        this._textureList = new Array();
        this._programList = new Array();
        this._samplerStates = new Array(8);
        this._container = canvas;
        try {
            this._gl = canvas.getContext("experimental-webgl", { premultipliedAlpha: false, alpha: false });
            if (!this._gl)
                this._gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: false });
        }
        catch (e) {
        }
        if (this._gl) {
            //this.dispatchEvent( new away.events.AwayEvent( away.events.AwayEvent.INITIALIZE_SUCCESS ) );
            //setup shortcut dictionaries
            this._blendFactorDictionary[ContextGLBlendFactor.ONE] = this._gl.ONE;
            this._blendFactorDictionary[ContextGLBlendFactor.DESTINATION_ALPHA] = this._gl.DST_ALPHA;
            this._blendFactorDictionary[ContextGLBlendFactor.DESTINATION_COLOR] = this._gl.DST_COLOR;
            this._blendFactorDictionary[ContextGLBlendFactor.ONE] = this._gl.ONE;
            this._blendFactorDictionary[ContextGLBlendFactor.ONE_MINUS_DESTINATION_ALPHA] = this._gl.ONE_MINUS_DST_ALPHA;
            this._blendFactorDictionary[ContextGLBlendFactor.ONE_MINUS_DESTINATION_COLOR] = this._gl.ONE_MINUS_DST_COLOR;
            this._blendFactorDictionary[ContextGLBlendFactor.ONE_MINUS_SOURCE_ALPHA] = this._gl.ONE_MINUS_SRC_ALPHA;
            this._blendFactorDictionary[ContextGLBlendFactor.ONE_MINUS_SOURCE_COLOR] = this._gl.ONE_MINUS_SRC_COLOR;
            this._blendFactorDictionary[ContextGLBlendFactor.SOURCE_ALPHA] = this._gl.SRC_ALPHA;
            this._blendFactorDictionary[ContextGLBlendFactor.SOURCE_COLOR] = this._gl.SRC_COLOR;
            this._blendFactorDictionary[ContextGLBlendFactor.ZERO] = this._gl.ZERO;
            this._depthTestDictionary[ContextGLCompareMode.ALWAYS] = this._gl.ALWAYS;
            this._depthTestDictionary[ContextGLCompareMode.EQUAL] = this._gl.EQUAL;
            this._depthTestDictionary[ContextGLCompareMode.GREATER] = this._gl.GREATER;
            this._depthTestDictionary[ContextGLCompareMode.GREATER_EQUAL] = this._gl.GEQUAL;
            this._depthTestDictionary[ContextGLCompareMode.LESS] = this._gl.LESS;
            this._depthTestDictionary[ContextGLCompareMode.LESS_EQUAL] = this._gl.LEQUAL;
            this._depthTestDictionary[ContextGLCompareMode.NEVER] = this._gl.NEVER;
            this._depthTestDictionary[ContextGLCompareMode.NOT_EQUAL] = this._gl.NOTEQUAL;
            this._textureIndexDictionary[0] = this._gl.TEXTURE0;
            this._textureIndexDictionary[1] = this._gl.TEXTURE1;
            this._textureIndexDictionary[2] = this._gl.TEXTURE2;
            this._textureIndexDictionary[3] = this._gl.TEXTURE3;
            this._textureIndexDictionary[4] = this._gl.TEXTURE4;
            this._textureIndexDictionary[5] = this._gl.TEXTURE5;
            this._textureIndexDictionary[6] = this._gl.TEXTURE6;
            this._textureIndexDictionary[7] = this._gl.TEXTURE7;
            this._textureTypeDictionary["texture2d"] = this._gl.TEXTURE_2D;
            this._textureTypeDictionary["textureCube"] = this._gl.TEXTURE_CUBE_MAP;
            this._wrapDictionary[ContextGLWrapMode.REPEAT] = this._gl.REPEAT;
            this._wrapDictionary[ContextGLWrapMode.CLAMP] = this._gl.CLAMP_TO_EDGE;
            this._filterDictionary[ContextGLTextureFilter.LINEAR] = this._gl.LINEAR;
            this._filterDictionary[ContextGLTextureFilter.NEAREST] = this._gl.NEAREST;
            this._mipmapFilterDictionary[ContextGLTextureFilter.LINEAR] = new Object();
            this._mipmapFilterDictionary[ContextGLTextureFilter.LINEAR][ContextGLMipFilter.MIPNEAREST] = this._gl.LINEAR_MIPMAP_NEAREST;
            this._mipmapFilterDictionary[ContextGLTextureFilter.LINEAR][ContextGLMipFilter.MIPLINEAR] = this._gl.LINEAR_MIPMAP_LINEAR;
            this._mipmapFilterDictionary[ContextGLTextureFilter.LINEAR][ContextGLMipFilter.MIPNONE] = this._gl.LINEAR;
            this._mipmapFilterDictionary[ContextGLTextureFilter.NEAREST] = new Object();
            this._mipmapFilterDictionary[ContextGLTextureFilter.NEAREST][ContextGLMipFilter.MIPNEAREST] = this._gl.NEAREST_MIPMAP_NEAREST;
            this._mipmapFilterDictionary[ContextGLTextureFilter.NEAREST][ContextGLMipFilter.MIPLINEAR] = this._gl.NEAREST_MIPMAP_LINEAR;
            this._mipmapFilterDictionary[ContextGLTextureFilter.NEAREST][ContextGLMipFilter.MIPNONE] = this._gl.NEAREST;
            this._uniformLocationNameDictionary[ContextGLProgramType.VERTEX] = "vc";
            this._uniformLocationNameDictionary[ContextGLProgramType.FRAGMENT] = "fc";
            this._vertexBufferDimensionDictionary[ContextGLVertexBufferFormat.FLOAT_1] = 1;
            this._vertexBufferDimensionDictionary[ContextGLVertexBufferFormat.FLOAT_2] = 2;
            this._vertexBufferDimensionDictionary[ContextGLVertexBufferFormat.FLOAT_3] = 3;
            this._vertexBufferDimensionDictionary[ContextGLVertexBufferFormat.FLOAT_4] = 4;
            this._vertexBufferDimensionDictionary[ContextGLVertexBufferFormat.BYTES_4] = 4;
        }
        else {
            //this.dispatchEvent( new away.events.AwayEvent( away.events.AwayEvent.INITIALIZE_FAILED, e ) );
            alert("WebGL is not available.");
        }
        for (var i = 0; i < ContextGLSL.MAX_SAMPLERS; ++i) {
            this._samplerStates[i] = new SamplerState();
            this._samplerStates[i].wrap = this._gl.REPEAT;
            this._samplerStates[i].filter = this._gl.LINEAR;
            this._samplerStates[i].mipfilter = this._gl.LINEAR;
        }
    }
    Object.defineProperty(ContextGLSL.prototype, "container", {
        get: function () {
            return this._container;
        },
        enumerable: true,
        configurable: true
    });
    ContextGLSL.prototype.gl = function () {
        return this._gl;
    };
    ContextGLSL.prototype.clear = function (red, green, blue, alpha, depth, stencil, mask) {
        if (red === void 0) { red = 0; }
        if (green === void 0) { green = 0; }
        if (blue === void 0) { blue = 0; }
        if (alpha === void 0) { alpha = 1; }
        if (depth === void 0) { depth = 1; }
        if (stencil === void 0) { stencil = 0; }
        if (mask === void 0) { mask = ContextGLClearMask.ALL; }
        if (!this._drawing) {
            this.updateBlendStatus();
            this._drawing = true;
        }
        var glmask = 0;
        if (mask & ContextGLClearMask.COLOR)
            glmask |= this._gl.COLOR_BUFFER_BIT;
        if (mask & ContextGLClearMask.STENCIL)
            glmask |= this._gl.STENCIL_BUFFER_BIT;
        if (mask & ContextGLClearMask.DEPTH)
            glmask |= this._gl.DEPTH_BUFFER_BIT;
        this._gl.clearColor(red, green, blue, alpha);
        this._gl.clearDepth(depth);
        this._gl.clearStencil(stencil);
        this._gl.clear(glmask);
    };
    ContextGLSL.prototype.configureBackBuffer = function (width, height, antiAlias, enableDepthAndStencil) {
        if (enableDepthAndStencil === void 0) { enableDepthAndStencil = true; }
        this._width = width;
        this._height = height;
        if (enableDepthAndStencil) {
            this._gl.enable(this._gl.STENCIL_TEST);
            this._gl.enable(this._gl.DEPTH_TEST);
        }
        this._gl.viewport['width'] = width;
        this._gl.viewport['height'] = height;
        this._gl.viewport(0, 0, width, height);
    };
    ContextGLSL.prototype.createCubeTexture = function (size, format, optimizeForRenderToTexture, streamingLevels) {
        if (streamingLevels === void 0) { streamingLevels = 0; }
        var texture = new CubeTextureWebGL(this._gl, size);
        this._textureList.push(texture);
        return texture;
    };
    ContextGLSL.prototype.createIndexBuffer = function (numIndices) {
        var indexBuffer = new IndexBufferWebGL(this._gl, numIndices);
        this._indexBufferList.push(indexBuffer);
        return indexBuffer;
    };
    ContextGLSL.prototype.createProgram = function () {
        var program = new ProgramGLSL(this._gl);
        this._programList.push(program);
        return program;
    };
    ContextGLSL.prototype.createTexture = function (width, height, format, optimizeForRenderToTexture, streamingLevels) {
        if (streamingLevels === void 0) { streamingLevels = 0; }
        //TODO streaming
        var texture = new TextureWebGL(this._gl, width, height);
        this._textureList.push(texture);
        return texture;
    };
    ContextGLSL.prototype.createVertexBuffer = function (numVertices, data32PerVertex) {
        var vertexBuffer = new VertexBufferWebGL(this._gl, numVertices, data32PerVertex);
        this._vertexBufferList.push(vertexBuffer);
        return vertexBuffer;
    };
    ContextGLSL.prototype.dispose = function () {
        var i;
        for (i = 0; i < this._indexBufferList.length; ++i)
            this._indexBufferList[i].dispose();
        this._indexBufferList = null;
        for (i = 0; i < this._vertexBufferList.length; ++i)
            this._vertexBufferList[i].dispose();
        this._vertexBufferList = null;
        for (i = 0; i < this._textureList.length; ++i)
            this._textureList[i].dispose();
        this._textureList = null;
        for (i = 0; i < this._programList.length; ++i)
            this._programList[i].dispose();
        for (i = 0; i < this._samplerStates.length; ++i)
            this._samplerStates[i] = null;
        this._programList = null;
    };
    ContextGLSL.prototype.drawToBitmapData = function (destination) {
        var arrayBuffer = new ArrayBuffer(destination.width * destination.height * 4);
        this._gl.readPixels(0, 0, destination.width, destination.height, this._gl.RGBA, this._gl.UNSIGNED_BYTE, new Uint8Array(arrayBuffer));
        var byteArray = new ByteArray();
        byteArray.setArrayBuffer(arrayBuffer);
        destination.setPixels(new Rectangle(0, 0, destination.width, destination.height), byteArray);
    };
    ContextGLSL.prototype.drawTriangles = function (indexBuffer, firstIndex, numTriangles) {
        if (firstIndex === void 0) { firstIndex = 0; }
        if (numTriangles === void 0) { numTriangles = -1; }
        if (!this._drawing)
            throw "Need to clear before drawing if the buffer has not been cleared since the last present() call.";
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, indexBuffer.glBuffer);
        this._gl.drawElements(this._gl.TRIANGLES, (numTriangles == -1) ? indexBuffer.numIndices : numTriangles * 3, this._gl.UNSIGNED_SHORT, firstIndex);
    };
    ContextGLSL.prototype.present = function () {
        this._drawing = false;
    };
    ContextGLSL.prototype.setBlendFactors = function (sourceFactor, destinationFactor) {
        this._blendEnabled = true;
        this._blendSourceFactor = this._blendFactorDictionary[sourceFactor];
        this._blendDestinationFactor = this._blendFactorDictionary[destinationFactor];
        this.updateBlendStatus();
    };
    ContextGLSL.prototype.setColorMask = function (red, green, blue, alpha) {
        this._gl.colorMask(red, green, blue, alpha);
    };
    ContextGLSL.prototype.setCulling = function (triangleFaceToCull, coordinateSystem) {
        if (coordinateSystem === void 0) { coordinateSystem = "leftHanded"; }
        if (triangleFaceToCull == ContextGLTriangleFace.NONE) {
            this._gl.disable(this._gl.CULL_FACE);
        }
        else {
            this._gl.enable(this._gl.CULL_FACE);
            switch (triangleFaceToCull) {
                case ContextGLTriangleFace.BACK:
                    this._gl.cullFace((coordinateSystem == "leftHanded") ? this._gl.FRONT : this._gl.BACK);
                    break;
                case ContextGLTriangleFace.FRONT:
                    this._gl.cullFace((coordinateSystem == "leftHanded") ? this._gl.BACK : this._gl.FRONT);
                    break;
                case ContextGLTriangleFace.FRONT_AND_BACK:
                    this._gl.cullFace(this._gl.FRONT_AND_BACK);
                    break;
                default:
                    throw "Unknown ContextGLTriangleFace type.";
            }
        }
    };
    // TODO ContextGLCompareMode
    ContextGLSL.prototype.setDepthTest = function (depthMask, passCompareMode) {
        this._gl.depthFunc(this._depthTestDictionary[passCompareMode]);
        this._gl.depthMask(depthMask);
    };
    ContextGLSL.prototype.setProgram = function (program) {
        //TODO decide on construction/reference resposibilities
        this._currentProgram = program;
        program.focusProgram();
    };
    ContextGLSL.prototype.setProgramConstantsFromMatrix = function (programType, firstRegister, matrix, transposedMatrix) {
        //this._gl.uniformMatrix4fv(this._gl.getUniformLocation(this._currentProgram.glProgram, this._uniformLocationNameDictionary[programType]), !transposedMatrix, new Float32Array(matrix.rawData));
        if (transposedMatrix === void 0) { transposedMatrix = false; }
        //TODO remove special case for WebGL matrix calls?
        var d = matrix.rawData;
        if (transposedMatrix) {
            this.setProgramConstantsFromArray(programType, firstRegister, [d[0], d[4], d[8], d[12]], 1);
            this.setProgramConstantsFromArray(programType, firstRegister + 1, [d[1], d[5], d[9], d[13]], 1);
            this.setProgramConstantsFromArray(programType, firstRegister + 2, [d[2], d[6], d[10], d[14]], 1);
            this.setProgramConstantsFromArray(programType, firstRegister + 3, [d[3], d[7], d[11], d[15]], 1);
        }
        else {
            this.setProgramConstantsFromArray(programType, firstRegister, [d[0], d[1], d[2], d[3]], 1);
            this.setProgramConstantsFromArray(programType, firstRegister + 1, [d[4], d[5], d[6], d[7]], 1);
            this.setProgramConstantsFromArray(programType, firstRegister + 2, [d[8], d[9], d[10], d[11]], 1);
            this.setProgramConstantsFromArray(programType, firstRegister + 3, [d[12], d[13], d[14], d[15]], 1);
        }
    };
    ContextGLSL.prototype.setProgramConstantsFromArray = function (programType, firstRegister, data, numRegisters) {
        if (numRegisters === void 0) { numRegisters = -1; }
        var locationName = this._uniformLocationNameDictionary[programType];
        var startIndex;
        for (var i = 0; i < numRegisters; i++) {
            startIndex = i * 4;
            this._gl.uniform4f(this._gl.getUniformLocation(this._currentProgram.glProgram, locationName + (firstRegister + i)), data[startIndex], data[startIndex + 1], data[startIndex + 2], data[startIndex + 3]);
        }
    };
    ContextGLSL.prototype.setScissorRectangle = function (rectangle) {
        if (!rectangle) {
            this._gl.disable(this._gl.SCISSOR_TEST);
            return;
        }
        this._gl.enable(this._gl.SCISSOR_TEST);
        this._gl.scissor(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    };
    ContextGLSL.prototype.setTextureAt = function (sampler, texture) {
        var samplerState = this._samplerStates[sampler];
        if (this._activeTexture != sampler && (texture || samplerState.type)) {
            this._activeTexture = sampler;
            this._gl.activeTexture(this._textureIndexDictionary[sampler]);
        }
        if (!texture) {
            if (samplerState.type) {
                this._gl.bindTexture(samplerState.type, null);
                samplerState.type = null;
            }
            return;
        }
        var textureType = this._textureTypeDictionary[texture.textureType];
        samplerState.type = textureType;
        this._gl.bindTexture(textureType, texture.glTexture);
        this._gl.uniform1i(this._gl.getUniformLocation(this._currentProgram.glProgram, "fs" + sampler), sampler);
        this._gl.texParameteri(textureType, this._gl.TEXTURE_WRAP_S, samplerState.wrap);
        this._gl.texParameteri(textureType, this._gl.TEXTURE_WRAP_T, samplerState.wrap);
        this._gl.texParameteri(textureType, this._gl.TEXTURE_MAG_FILTER, samplerState.filter);
        this._gl.texParameteri(textureType, this._gl.TEXTURE_MIN_FILTER, samplerState.mipfilter);
    };
    ContextGLSL.prototype.setSamplerStateAt = function (sampler, wrap, filter, mipfilter) {
        if (0 <= sampler && sampler < ContextGLSL.MAX_SAMPLERS) {
            this._samplerStates[sampler].wrap = this._wrapDictionary[wrap];
            this._samplerStates[sampler].filter = this._filterDictionary[filter];
            this._samplerStates[sampler].mipfilter = this._mipmapFilterDictionary[filter][mipfilter];
        }
        else {
            throw "Sampler is out of bounds.";
        }
    };
    ContextGLSL.prototype.setVertexBufferAt = function (location, buffer, bufferOffset, format) {
        if (bufferOffset === void 0) { bufferOffset = 0; }
        if (format === void 0) { format = null; }
        if (!buffer) {
            if (location > -1)
                this._gl.disableVertexAttribArray(location);
            return;
        }
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer.glBuffer);
        this._gl.enableVertexAttribArray(location);
        this._gl.vertexAttribPointer(location, this._vertexBufferDimensionDictionary[format], this._gl.FLOAT, false, buffer.data32PerVertex * 4, bufferOffset * 4);
    };
    ContextGLSL.prototype.setRenderToTexture = function (target, enableDepthAndStencil, antiAlias, surfaceSelector) {
        if (enableDepthAndStencil === void 0) { enableDepthAndStencil = false; }
        if (antiAlias === void 0) { antiAlias = 0; }
        if (surfaceSelector === void 0) { surfaceSelector = 0; }
        var texture = target;
        var frameBuffer = texture.frameBuffer;
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, frameBuffer);
        if (enableDepthAndStencil) {
            this._gl.enable(this._gl.STENCIL_TEST);
            this._gl.enable(this._gl.DEPTH_TEST);
        }
        this._gl.viewport(0, 0, texture.width, texture.height);
    };
    ContextGLSL.prototype.setRenderToBackBuffer = function () {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    };
    ContextGLSL.prototype.updateBlendStatus = function () {
        if (this._blendEnabled) {
            this._gl.enable(this._gl.BLEND);
            this._gl.blendEquation(this._gl.FUNC_ADD);
            this._gl.blendFunc(this._blendSourceFactor, this._blendDestinationFactor);
        }
        else {
            this._gl.disable(this._gl.BLEND);
        }
    };
    ContextGLSL.MAX_SAMPLERS = 8;
    ContextGLSL.modulo = 0;
    return ContextGLSL;
})();
module.exports = ContextGLSL;


},{"./ProgramGLSL":13,"awayjs-core/lib/geom/Rectangle":undefined,"awayjs-core/lib/utils/ByteArray":undefined,"awayjs-stagegl/lib/base/ContextGLBlendFactor":undefined,"awayjs-stagegl/lib/base/ContextGLClearMask":undefined,"awayjs-stagegl/lib/base/ContextGLCompareMode":undefined,"awayjs-stagegl/lib/base/ContextGLMipFilter":undefined,"awayjs-stagegl/lib/base/ContextGLProgramType":undefined,"awayjs-stagegl/lib/base/ContextGLTextureFilter":undefined,"awayjs-stagegl/lib/base/ContextGLTriangleFace":undefined,"awayjs-stagegl/lib/base/ContextGLVertexBufferFormat":undefined,"awayjs-stagegl/lib/base/ContextGLWrapMode":undefined,"awayjs-stagegl/lib/base/CubeTextureWebGL":undefined,"awayjs-stagegl/lib/base/IndexBufferWebGL":undefined,"awayjs-stagegl/lib/base/SamplerState":undefined,"awayjs-stagegl/lib/base/TextureWebGL":undefined,"awayjs-stagegl/lib/base/VertexBufferWebGL":undefined}],9:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ShaderCompilerBase = require("awayjs-renderergl/lib/compilation/ShaderCompilerBase");
var GLSLCompiler = (function (_super) {
    __extends(GLSLCompiler, _super);
    function GLSLCompiler() {
        _super.apply(this, arguments);
    }
    GLSLCompiler.prototype.compile = function () {
        this._pVertexCode = this._pMaterialPass._iGetVertexCode(this._pShaderObject, this._pRegisterCache, this._pSharedRegisters);
        this._pFragmentCode = this._pMaterialPass._iGetFragmentCode(this._pShaderObject, this._pRegisterCache, this._pSharedRegisters);
    };
    Object.defineProperty(GLSLCompiler.prototype, "postAnimationFragmentCode", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GLSLCompiler.prototype, "shadedTarget", {
        /**
         * The register name containing the final shaded colour.
         */
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    return GLSLCompiler;
})(ShaderCompilerBase);
module.exports = GLSLCompiler;


},{"awayjs-renderergl/lib/compilation/ShaderCompilerBase":undefined}],10:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MaterialPassGLBase = require("awayjs-renderergl/lib/passes/MaterialPassGLBase");
var GLSLShaderObject = require("./GLSLShaderObject");
var GLSLMaterialPass = (function (_super) {
    __extends(GLSLMaterialPass, _super);
    function GLSLMaterialPass(vertexCode, fragmentCode) {
        _super.call(this);
        this._vertexCode = vertexCode;
        this._fragmentCode = fragmentCode;
    }
    GLSLMaterialPass.prototype._iGetVertexCode = function (shaderObject, registerCache, sharedRegisters) {
        return this._vertexCode;
    };
    GLSLMaterialPass.prototype._iGetFragmentCode = function (shaderObject, registerCache, sharedRegisters) {
        return this._fragmentCode;
    };
    GLSLMaterialPass.prototype.createShaderObject = function (profile) {
        return new GLSLShaderObject(profile);
    };
    return GLSLMaterialPass;
})(MaterialPassGLBase);
module.exports = GLSLMaterialPass;


},{"./GLSLShaderObject":12,"awayjs-renderergl/lib/passes/MaterialPassGLBase":undefined}],11:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DefaultRenderer = require("awayjs-renderergl/lib/DefaultRenderer");
var ByteArray = require("awayjs-core/lib/utils/ByteArray");
var ContextMode = require("awayjs-display/lib/display/ContextMode");
var GLSLRenderer = (function (_super) {
    __extends(GLSLRenderer, _super);
    function GLSLRenderer() {
        _super.call(this, false, "baseline", ContextMode.NATIVE);
        this.__numUsedStreams = 0;
        this.__numUsedTextures = 0;
    }
    GLSLRenderer.prototype.getMaterial = function (material, profile) {
        var materialData = this["_materialDataPool"].getItem(material);
        if (materialData.invalidAnimation) {
            materialData.invalidAnimation = false;
            var materialDataPasses = materialData.getMaterialPasses(profile);
            var renderOrderId = 0;
            var mult = 1;
            var materialPassData;
            var len = materialDataPasses.length;
            for (var i = 0; i < len; i++) {
                materialPassData = materialDataPasses[i];
                renderOrderId += this.getProgram(materialPassData).id * mult;
                mult *= 1000;
            }
            materialData.renderOrderId = renderOrderId;
        }
        return materialData;
    };
    GLSLRenderer.prototype.activateMaterialPass = function (materialPassData, camera) {
        var shaderObject = materialPassData.shaderObject;
        for (var i = shaderObject.numUsedStreams; i < this.__numUsedStreams; i++)
            this._pContext.setVertexBufferAt(i, null);
        for (var i = shaderObject.numUsedTextures; i < this.__numUsedTextures; i++)
            this._pContext.setTextureAt(i, null);
        //activate shader object
        shaderObject.iActivate(this._pStage, camera);
        //check program data is uploaded
        var programData = this.getProgram(materialPassData);
        if (!programData.program) {
            programData.program = this._pContext.createProgram();
            var vertexByteCode = this.stringToByteArray(materialPassData.vertexCode);
            var fragmentByteCode = this.stringToByteArray(materialPassData.fragmentCode);
            programData.program.upload(vertexByteCode, fragmentByteCode);
        }
        //set program data
        this._pContext.setProgram(programData.program);
    };
    GLSLRenderer.prototype.stringToByteArray = function (value) {
        var len = value.length;
        var ba = new ByteArray();
        ba.writeUnsignedInt(len);
        for (var i = 0; i < len; ++i) {
            ba.writeByte(value.charCodeAt(i));
        }
        return ba;
    };
    GLSLRenderer.prototype.deactivateMaterialPass = function (materialPassData) {
        var shaderObject = materialPassData.shaderObject;
        if (materialPassData.usesAnimation)
            materialPassData.material.animationSet.deactivate(shaderObject, this._pStage);
        materialPassData.shaderObject.iDeactivate(this._pStage);
        this.__numUsedStreams = shaderObject.numUsedStreams;
        this.__numUsedTextures = shaderObject.numUsedTextures;
    };
    return GLSLRenderer;
})(DefaultRenderer);
module.exports = GLSLRenderer;


},{"awayjs-core/lib/utils/ByteArray":undefined,"awayjs-display/lib/display/ContextMode":undefined,"awayjs-renderergl/lib/DefaultRenderer":undefined}],12:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ShaderObjectBase = require("awayjs-renderergl/lib/compilation/ShaderObjectBase");
var GLSLCompiler = require("./GLSLCompiler");
var GLSLShaderObject = (function (_super) {
    __extends(GLSLShaderObject, _super);
    function GLSLShaderObject() {
        _super.apply(this, arguments);
    }
    GLSLShaderObject.prototype.createCompiler = function (material, materialPass) {
        return new GLSLCompiler(material, materialPass, this);
    };
    return GLSLShaderObject;
})(ShaderObjectBase);
module.exports = GLSLShaderObject;


},{"./GLSLCompiler":9,"awayjs-renderergl/lib/compilation/ShaderObjectBase":undefined}],13:[function(require,module,exports){
var ProgramGLSL = (function () {
    function ProgramGLSL(gl) {
        this._gl = gl;
        this._program = this._gl.createProgram();
    }
    ProgramGLSL.prototype.upload = function (vertexProgram, fragmentProgram) {
        vertexProgram.position = 0;
        fragmentProgram.position = 0;
        var vertexString = this.byteArrayToString(vertexProgram);
        var fragmentString = this.byteArrayToString(fragmentProgram);
        this._vertexShader = this._gl.createShader(this._gl.VERTEX_SHADER);
        this._fragmentShader = this._gl.createShader(this._gl.FRAGMENT_SHADER);
        this._gl.shaderSource(this._vertexShader, vertexString);
        this._gl.compileShader(this._vertexShader);
        if (!this._gl.getShaderParameter(this._vertexShader, this._gl.COMPILE_STATUS)) {
            console.log("Error compiling vertex shader");
            throw new Error(this._gl.getShaderInfoLog(this._vertexShader));
        }
        this._gl.shaderSource(this._fragmentShader, fragmentString);
        this._gl.compileShader(this._fragmentShader);
        if (!this._gl.getShaderParameter(this._fragmentShader, this._gl.COMPILE_STATUS)) {
            console.log("Error compiling fragment shader");
            throw new Error(this._gl.getShaderInfoLog(this._fragmentShader));
        }
        this._gl.attachShader(this._program, this._vertexShader);
        this._gl.attachShader(this._program, this._fragmentShader);
        this._gl.linkProgram(this._program);
        if (!this._gl.getProgramParameter(this._program, this._gl.LINK_STATUS)) {
            throw new Error(this._gl.getProgramInfoLog(this._program));
        }
    };
    ProgramGLSL.prototype.byteArrayToString = function (ba) {
        ba.position = 0;
        var len = ba.readUnsignedInt();
        var str = "";
        for (var i = 0; i < len; ++i)
            str += String.fromCharCode(ba.readByte());
        return str;
    };
    ProgramGLSL.prototype.dispose = function () {
        this._gl.deleteProgram(this._program);
    };
    ProgramGLSL.prototype.focusProgram = function () {
        this._gl.useProgram(this._program);
    };
    Object.defineProperty(ProgramGLSL.prototype, "glProgram", {
        get: function () {
            return this._program;
        },
        enumerable: true,
        configurable: true
    });
    return ProgramGLSL;
})();
module.exports = ProgramGLSL;


},{}],14:[function(require,module,exports){
var Stage = require("awayjs-stagegl/lib/base/Stage");
var ContextMode = require("awayjs-display/lib/display/ContextMode");
var ContextWebGL = require("awayjs-stagegl/lib/base/ContextWebGL");
var Event = require("awayjs-core/lib/events/Event");
var ContextStage3D = require("awayjs-stagegl/lib/base/ContextStage3D");
var ContextGLSL = require("./ContextGLSL");
// MASSIVE HACK
var StageHack = (function () {
    function StageHack() {
    }
    StageHack.INIT = function () {
        Stage.prototype.requestContext = function (forceSoftware, profile, mode) {
            var _this = this;
            if (forceSoftware === void 0) { forceSoftware = false; }
            if (profile === void 0) { profile = "baseline"; }
            if (mode === void 0) { mode = "auto"; }
            if (this._usesSoftwareRendering != null)
                this._usesSoftwareRendering = forceSoftware;
            this._profile = profile;
            try {
                if (mode == ContextMode.FLASH)
                    new ContextStage3D(this._container, function (context) { return _this._callback(context); });
                else if (mode == ContextMode.WEBGL)
                    this._context = new ContextWebGL(this._container);
                else if (mode == ContextMode.NATIVE) {
                    this._context = new ContextGLSL(this._container);
                }
            }
            catch (e) {
                try {
                    if (mode == ContextMode.AUTO)
                        new ContextStage3D(this._container, function (context) { return _this._callback(context); });
                    else
                        this.dispatchEvent(new Event(Event.ERROR));
                }
                catch (e) {
                    this.dispatchEvent(new Event(Event.ERROR));
                }
            }
            if (this._context)
                this._callback(this._context);
        };
    };
    return StageHack;
})();
module.exports = StageHack;


},{"./ContextGLSL":8,"awayjs-core/lib/events/Event":undefined,"awayjs-display/lib/display/ContextMode":undefined,"awayjs-stagegl/lib/base/ContextStage3D":undefined,"awayjs-stagegl/lib/base/ContextWebGL":undefined,"awayjs-stagegl/lib/base/Stage":undefined}],15:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MaterialBase = require("awayjs-display/lib/materials/MaterialBase");
var DataVisPass = require("./DataVisPass");
var GlobePass = require("./GlobePass");
var DataVisMaterial = (function (_super) {
    __extends(DataVisMaterial, _super);
    function DataVisMaterial(useGradients) {
        if (useGradients === void 0) { useGradients = false; }
        _super.call(this);
        this._globePass = new GlobePass();
        this._dataVisPass = new DataVisPass(useGradients);
        this._pAddScreenPass(this._globePass);
        this._pAddScreenPass(this._dataVisPass);
    }
    Object.defineProperty(DataVisMaterial.prototype, "dataVisRenderable", {
        get: function () {
            return this._dataVisPass.dataVisRenderable;
        },
        set: function (value) {
            this._dataVisPass.dataVisRenderable = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisMaterial.prototype, "hour", {
        get: function () {
            return this._dataVisPass.hour;
        },
        set: function (value) {
            this._dataVisPass.hour = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisMaterial.prototype, "maxValue", {
        get: function () {
            return this._dataVisPass.maxValue;
        },
        set: function (value) {
            this._dataVisPass.maxValue = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisMaterial.prototype, "texture", {
        get: function () {
            return this._globePass.globeTexture;
        },
        set: function (value) {
            this._globePass.globeTexture = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisMaterial.prototype, "minColor", {
        get: function () {
            return this._dataVisPass.minColor;
        },
        set: function (value) {
            this._dataVisPass.minColor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisMaterial.prototype, "maxColor", {
        get: function () {
            return this._dataVisPass.maxColor;
        },
        set: function (value) {
            this._dataVisPass.maxColor = value;
        },
        enumerable: true,
        configurable: true
    });
    return DataVisMaterial;
})(MaterialBase);
module.exports = DataVisMaterial;


},{"./DataVisPass":16,"./GlobePass":17,"awayjs-display/lib/materials/MaterialBase":undefined}],16:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Matrix3D = require("awayjs-core/lib/geom/Matrix3D");
var GLSLMaterialPass = require("./../glsl/GLSLMaterialPass");
var DataVisPass = (function (_super) {
    __extends(DataVisPass, _super);
    function DataVisPass(useGradients) {
        if (useGradients === void 0) { useGradients = false; }
        _super.call(this, (useGradients ? "#define USE_GRADIENTS\n" : "") + DataVisPass.VERTEX_CODE, DataVisPass.FRAGMENT_CODE);
        this._radiusDirty = true;
        this._hourDirty = true;
        this._colorsDirty = true;
        this._maxValueDirty = true;
        this._wvpMatrix = new Matrix3D();
        this._sphereRadius = 10.0;
        this._maxValue = 1.0;
        this._hour = 0;
        this._minColor = 0x1A3056;
        this._maxColor = 0x83b1ff;
    }
    Object.defineProperty(DataVisPass.prototype, "minColor", {
        get: function () {
            return this._minColor;
        },
        set: function (value) {
            this._minColor = value;
            this._colorsDirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisPass.prototype, "maxColor", {
        get: function () {
            return this._maxColor;
        },
        set: function (value) {
            this._maxColor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisPass.prototype, "dataVisRenderable", {
        get: function () {
            return this._dataVisRenderable;
        },
        set: function (value) {
            this._dataVisRenderable = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisPass.prototype, "sphereRadius", {
        get: function () {
            return this._sphereRadius;
        },
        set: function (value) {
            this._sphereRadius = value;
            this._radiusDirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisPass.prototype, "maxValue", {
        get: function () {
            return this._maxValue;
        },
        set: function (value) {
            this._maxValue = value;
            this._maxValueDirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataVisPass.prototype, "hour", {
        get: function () {
            return this._hour;
        },
        set: function (value) {
            this._hour = value;
            this._hourDirty = true;
        },
        enumerable: true,
        configurable: true
    });
    DataVisPass.prototype._iActivate = function (pass, renderer, camera) {
        if (!this._dataVisRenderable)
            return;
        renderer.activateMaterialPass(pass, camera);
        this._gl = renderer._pContext.gl();
        var program = pass.programData.program["_program"];
        if (!this._wvpPosition) {
            this._sphereRadiusPosition = this._gl.getUniformLocation(program, "sphereRadius");
            this._hourInterpolationPosition = this._gl.getUniformLocation(program, "hourInterpolation");
            this._wvpPosition = this._gl.getUniformLocation(program, "wvpMatrix");
            this._latLongAttribute = this._gl.getAttribLocation(program, "latLongPosition");
            this._offsetPositionAttribute = this._gl.getAttribLocation(program, "offsetPosition");
            this._valueHour1Attribute = this._gl.getAttribLocation(program, "valueHour1");
            this._valueHour2Attribute = this._gl.getAttribLocation(program, "valueHour2");
            var program = pass.programData.program["_program"];
            this._minColorLocation = this._gl.getUniformLocation(program, "minColor");
            this._maxColorLocation = this._gl.getUniformLocation(program, "maxColor");
        }
        if (this._maxValueDirty) {
            console.log("Changing max value to " + this._maxValue);
            this._gl.uniform1f(this._gl.getUniformLocation(program, "rcpMaxValue"), this._maxValue == 0 ? 1.0 : 1.0 / this._maxValue);
            this._maxValueDirty = false;
        }
        if (this._radiusDirty) {
            this._gl.uniform1f(this._sphereRadiusPosition, this._sphereRadius);
            this._radiusDirty = false;
        }
        if (this._hourDirty) {
            this._gl.uniform1f(this._hourInterpolationPosition, this._hour - Math.floor(this._hour));
            this._hourDirty = false;
        }
        if (this._colorsDirty) {
            this._gl.uniform3f(this._minColorLocation, (this._minColor >> 16) / 0xff, ((this._minColor >> 8) & 0xff) / 0xff, (this._minColor & 0xff) / 0xff);
            this._gl.uniform3f(this._maxColorLocation, (this._maxColor >> 16) / 0xff, ((this._maxColor >> 8) & 0xff) / 0xff, (this._maxColor & 0xff) / 0xff);
        }
        this._gl.enableVertexAttribArray(this._offsetPositionAttribute);
        this._gl.enableVertexAttribArray(this._latLongAttribute);
        this._gl.enableVertexAttribArray(this._valueHour1Attribute);
        this._gl.enableVertexAttribArray(this._valueHour2Attribute);
    };
    DataVisPass.prototype.setRenderState = function (pass, renderable, stage, camera, viewProjection) {
        if (!this._dataVisRenderable)
            return;
        this._wvpMatrix.copyFrom(renderable.renderSceneTransform);
        this._wvpMatrix.append(viewProjection);
        var f32 = new Float32Array(this._wvpMatrix.rawData);
        this._gl.uniformMatrix4fv(this._wvpPosition, false, f32);
        var len = this._dataVisRenderable.numSubRenderables;
        for (var i = 0; i < len; ++i) {
            var subRenderable = this._dataVisRenderable.getSubRenderable(i);
            var vertexPosBuffer = subRenderable.getVertexPositionBuffer(this._gl);
            var vertexHourlyBuffer = subRenderable.getVertexHourlyBuffer(this._gl);
            var indexBuffer = subRenderable.getIndexBuffer(this._gl);
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vertexPosBuffer);
            this._gl.vertexAttribPointer(this._offsetPositionAttribute, 3, this._gl.FLOAT, false, 20, 0);
            this._gl.vertexAttribPointer(this._latLongAttribute, 2, this._gl.FLOAT, false, 20, 12);
            var currentHour = Math.floor(this._hour);
            var nextHour = currentHour + 1;
            if (nextHour == 24)
                nextHour = 0;
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vertexHourlyBuffer);
            this._gl.vertexAttribPointer(this._valueHour1Attribute, 1, this._gl.FLOAT, false, 96, currentHour * 4);
            this._gl.vertexAttribPointer(this._valueHour2Attribute, 1, this._gl.FLOAT, false, 96, nextHour * 4);
            this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            this._gl.drawElements(this._gl.TRIANGLES, subRenderable.numTriangles * 3, this._gl.UNSIGNED_SHORT, 0);
        }
    };
    DataVisPass.prototype._iDeactivate = function (pass, renderer) {
        renderer.deactivateMaterialPass(pass);
        this._gl.disableVertexAttribArray(this._offsetPositionAttribute);
        this._gl.disableVertexAttribArray(this._latLongAttribute);
        this._gl.disableVertexAttribArray(this._valueHour1Attribute);
        this._gl.disableVertexAttribArray(this._valueHour2Attribute);
    };
    DataVisPass.VERTEX_CODE = "\
        precision mediump float;\n\
        \n\
        attribute vec2 latLongPosition;\n\
        attribute vec3 offsetPosition;\n\
        \n\
        attribute float valueHour1;\n\
        attribute float valueHour2;\n\
        \n\
        uniform mat4 wvpMatrix;\n\
        uniform float sphereRadius;\n\
        uniform float hourInterpolation;\n\
        uniform vec3 minColor;\n\
        uniform vec3 maxColor;\n\
        uniform float rcpMaxValue;\n\
        \n\
        varying vec3 color;\n\
        \n\
        void main() {\n\
            float latitude = latLongPosition.x;\n\
            float longitude = latLongPosition.y;\n\
            float cosX = cos(latitude);\n\
            float sinX = sin(latitude);\n\
            float cosY = cos(longitude);\n\
            float sinY = sin(longitude);\n\
            // todo: could encode this in normal/tangent buffer, calc zAxis dynamically\n\
            vec3 yAxis = vec3(-sinY*sinX, cosX, sinX * cosY);\n\
            vec3 zAxis = vec3(-sinY*cosX, -sinX, cosX * cosY);\n\
            vec3 xAxis = cross(yAxis, zAxis);\n\
            mat3 rotation;\
            rotation = mat3(xAxis, yAxis, zAxis);\n\
            float value = mix(valueHour1, valueHour2, hourInterpolation);\n\
            float ratio = value * rcpMaxValue;\n\
            vec3 localPos = offsetPosition * ratio;\n\
            \n\
        #ifdef USE_GRADIENTS\n\
            color = mix(minColor, maxColor, clamp(localPos.z, 0.0, 1.0));\n\
        #else\n\
            color = mix(minColor, maxColor, clamp(ratio, 0.0, 1.0));\n\
        #endif\n\
            localPos.z += sphereRadius;\n\
            vec4 rotatedPos = vec4(rotation * localPos, 1.0);\n\
            gl_Position = wvpMatrix * rotatedPos;\n\
        }\
    ";
    DataVisPass.FRAGMENT_CODE = "\
        precision mediump float;\n\
        \n\
        varying vec3 color;\n\
        \n\
        void main() {\n\
            gl_FragColor = vec4(color, 1.0);\n\
        }\
    ";
    return DataVisPass;
})(GLSLMaterialPass);
module.exports = DataVisPass;


},{"./../glsl/GLSLMaterialPass":10,"awayjs-core/lib/geom/Matrix3D":undefined}],17:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Matrix3D = require("awayjs-core/lib/geom/Matrix3D");
var TriangleSubGeometry = require("awayjs-display/lib/base/TriangleSubGeometry");
var GLSLMaterialPass = require("./../glsl/GLSLMaterialPass");
var GlobePass = (function (_super) {
    __extends(GlobePass, _super);
    function GlobePass() {
        _super.call(this, GlobePass.VERTEX_CODE, GlobePass.FRAGMENT_CODE);
        this._matrix = new Matrix3D();
    }
    Object.defineProperty(GlobePass.prototype, "globeTexture", {
        get: function () {
            return this._globeTexture;
        },
        set: function (value) {
            this._globeTexture = value;
        },
        enumerable: true,
        configurable: true
    });
    GlobePass.prototype._iActivate = function (pass, renderer, camera) {
        renderer.activateMaterialPass(pass, camera);
        this._gl = renderer._pContext.gl();
        var program = pass.programData.program["_program"];
        if (!this._wvpPosition) {
            this._wvpPosition = this._gl.getUniformLocation(program, "wvpMatrix");
            this._worldViewMatrixPosition = this._gl.getUniformLocation(program, "worldViewMatrix");
            this._positionAttribute = this._gl.getAttribLocation(program, "position");
            this._uvAttribute = this._gl.getAttribLocation(program, "uv");
            this._normalAttribute = this._gl.getAttribLocation(program, "normal");
            var textureIndex = this._gl.getUniformLocation(program, "globeSampler");
            this._gl.uniform1i(textureIndex, 0);
        }
    };
    GlobePass.prototype.setRenderState = function (pass, renderable, stage, camera, viewProjection) {
        this._matrix.copyFrom(renderable.renderSceneTransform);
        this._matrix.append(viewProjection);
        var f32 = new Float32Array(this._matrix.rawData);
        this._gl.uniformMatrix4fv(this._wvpPosition, false, f32);
        this._matrix.copyFrom(renderable.renderSceneTransform);
        this._matrix.append(camera.inverseSceneTransform);
        f32 = new Float32Array(this._matrix.rawData);
        this._gl.uniformMatrix4fv(this._worldViewMatrixPosition, false, f32);
        stage.activateBuffer(this._positionAttribute, renderable.getVertexData(TriangleSubGeometry.POSITION_DATA), renderable.getVertexOffset(TriangleSubGeometry.POSITION_DATA), "float3");
        stage.activateBuffer(this._uvAttribute, renderable.getVertexData(TriangleSubGeometry.UV_DATA), renderable.getVertexOffset(TriangleSubGeometry.UV_DATA), "float2");
        stage.activateBuffer(this._normalAttribute, renderable.getVertexData(TriangleSubGeometry.NORMAL_DATA), renderable.getVertexOffset(TriangleSubGeometry.NORMAL_DATA), "float3");
        stage.activateTexture(0, this._globeTexture);
        stage.context.drawTriangles(stage.getIndexBuffer(renderable.getIndexData()), 0, renderable.numTriangles);
    };
    GlobePass.prototype._iDeactivate = function (pass, renderer) {
        renderer.deactivateMaterialPass(pass);
    };
    GlobePass.VERTEX_CODE = "\
        precision mediump float;\n\
        \n\
        attribute vec4 position;\n\
        attribute vec2 uv;\n\
        attribute vec3 normal;\n\
        \n\
        uniform mat4 wvpMatrix;\n\
        uniform mat4 worldViewMatrix;\n\
        \n\
        varying vec2 uvVar;\n\
        varying vec3 viewNormal;\n\
        \n\
        void main() {\n\
            gl_Position = wvpMatrix * position;\n\
            viewNormal = mat3(worldViewMatrix) * normal;\n\
            uvVar = uv;\n\
        }\
    ";
    GlobePass.FRAGMENT_CODE = "\
        precision mediump float;\n\
        \n\
        varying vec2 uvVar;\n\
        varying vec3 viewNormal;\n\
        uniform sampler2D globeSampler;\n\
        \n\
        void main() {\n\
            vec3 normal = normalize(viewNormal);\n\
            float rimFactor = 1.0 - clamp(-normal.z, 0.0, 1.0);\n\
            rimFactor = pow(rimFactor * 1.7, 4.0);\n\
            vec4 rimColor = vec4(1.0, 1.0, 1.0, 1.0);\n\
            vec4 globeColor = texture2D(globeSampler, uvVar);\n\
            gl_FragColor = mix(globeColor, rimColor, rimFactor);\n\
        }\
    ";
    return GlobePass;
})(GLSLMaterialPass);
module.exports = GlobePass;


},{"./../glsl/GLSLMaterialPass":10,"awayjs-core/lib/geom/Matrix3D":undefined,"awayjs-display/lib/base/TriangleSubGeometry":undefined}],18:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MaterialBase = require("awayjs-display/lib/materials/MaterialBase");
var HaloPass = require("./HaloPass");
var HaloMaterial = (function (_super) {
    __extends(HaloMaterial, _super);
    function HaloMaterial(texture) {
        _super.call(this);
        this._haloPass = new HaloPass();
        this._pAddScreenPass(this._haloPass);
        this._haloPass.texture = texture;
    }
    Object.defineProperty(HaloMaterial.prototype, "texture", {
        get: function () {
            return this._haloPass.texture;
        },
        set: function (value) {
            this._haloPass.texture = value;
        },
        enumerable: true,
        configurable: true
    });
    return HaloMaterial;
})(MaterialBase);
module.exports = HaloMaterial;


},{"./HaloPass":19,"awayjs-display/lib/materials/MaterialBase":undefined}],19:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Matrix3D = require("awayjs-core/lib/geom/Matrix3D");
var TriangleSubGeometry = require("awayjs-display/lib/base/TriangleSubGeometry");
var GLSLMaterialPass = require("./../glsl/GLSLMaterialPass");
var GlobePass = (function (_super) {
    __extends(GlobePass, _super);
    function GlobePass() {
        _super.call(this, GlobePass.VERTEX_CODE, GlobePass.FRAGMENT_CODE);
        this._matrix = new Matrix3D();
    }
    Object.defineProperty(GlobePass.prototype, "texture", {
        get: function () {
            return this._texture;
        },
        set: function (value) {
            this._texture = value;
        },
        enumerable: true,
        configurable: true
    });
    GlobePass.prototype._iActivate = function (pass, renderer, camera) {
        renderer.activateMaterialPass(pass, camera);
        this._gl = renderer._pContext.gl();
        var program = pass.programData.program["_program"];
        if (!this._wvpPosition) {
            this._wvpPosition = this._gl.getUniformLocation(program, "wvpMatrix");
            this._positionAttribute = this._gl.getAttribLocation(program, "position");
            this._uvAttribute = this._gl.getAttribLocation(program, "uv");
            var textureIndex = this._gl.getUniformLocation(program, "textureSampler");
            this._gl.uniform1i(textureIndex, 0);
        }
        this._gl.enable(this._gl.BLEND);
        this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE);
        this._gl.blendEquation(this._gl.FUNC_ADD);
        this._gl.depthMask(false);
    };
    GlobePass.prototype.setRenderState = function (pass, renderable, stage, camera, viewProjection) {
        this._matrix.copyFrom(renderable.renderSceneTransform);
        this._matrix.append(viewProjection);
        var f32 = new Float32Array(this._matrix.rawData);
        this._gl.uniformMatrix4fv(this._wvpPosition, false, f32);
        stage.activateBuffer(this._positionAttribute, renderable.getVertexData(TriangleSubGeometry.POSITION_DATA), renderable.getVertexOffset(TriangleSubGeometry.POSITION_DATA), "float3");
        stage.activateBuffer(this._uvAttribute, renderable.getVertexData(TriangleSubGeometry.UV_DATA), renderable.getVertexOffset(TriangleSubGeometry.UV_DATA), "float2");
        stage.activateTexture(0, this._texture);
        stage.context.drawTriangles(stage.getIndexBuffer(renderable.getIndexData()), 0, renderable.numTriangles);
    };
    GlobePass.prototype._iDeactivate = function (pass, renderer) {
        renderer.deactivateMaterialPass(pass);
        this._gl.disable(this._gl.BLEND);
        this._gl.depthMask(true);
    };
    GlobePass.VERTEX_CODE = "\
        precision mediump float;\n\
        \n\
        attribute vec4 position;\n\
        attribute vec2 uv;\n\
        \n\
        uniform mat4 wvpMatrix;\n\
        \n\
        varying vec2 uvVar;\n\
        \n\
        void main() {\n\
            gl_Position = wvpMatrix * position;\n\
            uvVar = uv;\n\
        }\
    ";
    GlobePass.FRAGMENT_CODE = "\
        precision mediump float;\n\
        \n\
        varying vec2 uvVar;\n\
        uniform sampler2D textureSampler;\n\
        \n\
        void main() {\n\
            gl_FragColor = texture2D(textureSampler, uvVar);\n\
        }\
    ";
    return GlobePass;
})(GLSLMaterialPass);
module.exports = GlobePass;


},{"./../glsl/GLSLMaterialPass":10,"awayjs-core/lib/geom/Matrix3D":undefined,"awayjs-display/lib/base/TriangleSubGeometry":undefined}],20:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var EventDispatcher = require("awayjs-core/lib/events/EventDispatcher");
var WorldDataEvent = require("./WorldDataEvent");
var WorldDataElement = require("./WorldDataElement");
var WorldDataSet = require("./WorldDataSet");
var URLLoader = require("awayjs-core/lib/net/URLLoader");
var URLLoaderDataFormat = require("awayjs-core/lib/net/URLLoaderDataFormat");
var URLRequest = require("awayjs-core/lib/net/URLRequest");
var Event = require("awayjs-core/lib/events/Event");
var IOErrorEvent = require("awayjs-core/lib/events/IOErrorEvent");
var ByteArray = require("awayjs-core/lib/utils/ByteArray");
var WorldData = (function (_super) {
    __extends(WorldData, _super);
    function WorldData() {
        _super.call(this);
        this.loadedCountries = {};
        this.loadedHandsets = {};
    }
    WorldData.prototype.load = function (view, handSet, timeType) {
        this.currentView = view;
        this.currentHandSet = handSet;
        this.currentTimeType = timeType;
        if (this.urlLoader) {
            this.urlLoader.dispose();
            this.urlLoader = null;
        }
        //
        //if (view == "0") {
        //    TODO: remove when gloval data will be avaliable
        //this.sendTestGlobalData();
        //return;
        //}
        this.generateEmptyData();
        if (!this.loadedCountries[view]) {
            this.loadCountry();
        }
        else {
            this.checkHandSet();
        }
    };
    WorldData.prototype.generateEmptyData = function () {
        this.emptyData = new WorldDataSet();
        var element = new WorldDataElement();
        element.latitude = 0;
        element.longitude = 0;
        var hours = new Array();
        for (var j = 0; j < 24; j++) {
            hours[j] = 0;
        }
        element.hourlyValues = hours;
        this.emptyData.averageElementValue = 0;
        this.emptyData.maxElementValue = 0;
        this.emptyData.elements.push(element);
    };
    WorldData.prototype.loadCountry = function () {
        var _this = this;
        this.urlLoader = new URLLoader();
        this.urlLoader.dataFormat = URLLoaderDataFormat.ARRAY_BUFFER;
        this.urlLoader.addEventListener(IOErrorEvent.IO_ERROR, function (event) { return _this.ioErrorCountry(event); });
        this.urlLoader.addEventListener(Event.COMPLETE, function (event) { return _this.onLocationLoaded(event); });
        this.urlLoader.load(new URLRequest('assets/locations/' + this.currentView + '.bin'));
    };
    WorldData.prototype.onLocationLoaded = function (event) {
        var loader = event.target;
        var bytes = new ByteArray();
        bytes.setArrayBuffer(loader.data);
        if (!bytes) {
            console.error("WorldData::onLocationLoaded. Locations " + this.currentView + " is not defined");
            return;
        }
        var positions = new Array();
        var counts = new Array();
        //var len:number = Math.min(15000, bytes.length / 12);
        var len = bytes.length / 12;
        var k = 0;
        for (var i = 0; i < len; i++) {
            positions[k++] = bytes.readFloat();
            positions[k++] = bytes.readFloat();
            counts[i] = bytes.readInt();
        }
        this.loadedCountries[this.currentView] = {
            numLocations: len,
            data: positions,
            counts: counts
        };
        bytes = null;
        if (loader) {
            loader.dispose();
            loader = null;
        }
        this.checkHandSet();
    };
    WorldData.prototype.checkHandSet = function () {
        var _this = this;
        //this.loadTestHandSet();
        //return;
        var key = this.currentView + "/" + this.currentHandSet;
        if (!this.loadedHandsets[key]) {
            this.urlLoader = new URLLoader();
            this.urlLoader.dataFormat = URLLoaderDataFormat.ARRAY_BUFFER;
            this.urlLoader.addEventListener(IOErrorEvent.IO_ERROR, function (event) { return _this.ioError(event); });
            this.urlLoader.addEventListener(Event.COMPLETE, function (event) { return _this.onHandSetLoaded(event); });
            this.urlLoader.load(new URLRequest('assets/counts/' + key + '.bin'));
        }
        else {
            this.loadHandSet();
        }
    };
    WorldData.prototype.loadTestHandSet = function () {
        var country = this.loadedCountries[this.currentView];
        var positions = country.data;
        var key = this.currentView + "/" + this.currentHandSet;
        var countHourData = new WorldDataSet();
        this.loadedHandsets[key] = countHourData;
        var len = country.numLocations;
        var k = 0;
        var average = 0;
        var max = 0;
        for (var i = 0; i < len; i++) {
            var total = 0;
            var element = new WorldDataElement();
            element.latitude = -positions[i * 2];
            element.longitude = positions[i * 2 + 1];
            var hours = new Array();
            for (var j = 0; j < 24; j++) {
                var value = .1 + Math.abs(Math.pow((Math.sin((j + element.latitude + element.longitude * .7) / 30) + Math.cos(element.latitude * element.longitude / 1000 + j)) * .5, 3));
                hours[j] = value;
                total += value;
                if (value > max)
                    max = value;
            }
            element.hourlyValues = hours;
            if (total == 0) {
                k++;
            }
            countHourData.elements.push(element);
            average += total;
        }
        // TODO: could calculate avg lat/long here as well, so 3D view doesn't have to loop again
        countHourData.maxElementValue = max;
        countHourData.averageElementValue = average / (len * 24); // who knows, this might be useful to detect outliers
        //console.log("Len: "+countHourData.length);
        //console.log("K: "+k);
        //average /= 24;
        //console.log("WorldData. Average value: "+average);
        this.loadHandSet();
    };
    WorldData.prototype.onHandSetLoaded = function (event) {
        var loader = event.target;
        var bytes = new ByteArray();
        bytes.setArrayBuffer(loader.data);
        if (!bytes) {
            console.error("WorldData::onHandSetLoaded. HandSet " + this.currentHandSet + " is not defined for view id(country): " + this.currentView);
            return;
        }
        var country = this.loadedCountries[this.currentView];
        var positions = country.data;
        var key = this.currentView + "/" + this.currentHandSet;
        var countHourData = new WorldDataSet();
        this.loadedHandsets[key] = countHourData;
        var len = country.numLocations;
        var k = 0;
        var average = 0;
        var max = 0;
        for (var i = 0; i < len; i++) {
            var total = 0;
            var element = new WorldDataElement();
            element.latitude = -positions[i * 2];
            element.longitude = positions[i * 2 + 1];
            var hours = new Array();
            for (var j = 0; j < 24; j++) {
                var value = bytes.readUnsignedByte();
                hours[j] = value;
                total += value;
                if (value > max)
                    max = value;
            }
            element.hourlyValues = hours;
            if (total == 0) {
                k++;
            }
            countHourData.elements.push(element);
            average += total;
        }
        // TODO: could calculate avg lat/long here as well, so 3D view doesn't have to loop again
        countHourData.maxElementValue = max;
        countHourData.averageElementValue = average / (len * 24); // who knows, this might be useful to detect outliers
        //console.log("Len: "+countHourData.length);
        //console.log("K: "+k);
        //average /= 24;
        //console.log("WorldData. Average value: "+average);
        bytes = null;
        if (loader) {
            loader.dispose();
            loader = null;
        }
        this.loadHandSet();
    };
    WorldData.prototype.loadHandSet = function () {
        var worldEvent = new WorldDataEvent(WorldDataEvent.LOADED);
        var key = this.currentView + "/" + this.currentHandSet;
        worldEvent.data = this.loadedHandsets[key];
        this.dispatchEvent(worldEvent);
    };
    WorldData.prototype.ioErrorCountry = function (event) {
        var loader = event.target;
        console.error('WorldData.ioErrorCountry', loader.url);
        var worldEvent = new WorldDataEvent(WorldDataEvent.NO_COUNTRY_DATA);
        worldEvent.data = this.emptyData;
        this.dispatchEvent(worldEvent);
    };
    WorldData.prototype.ioError = function (event) {
        var loader = event.target;
        console.error('WorldData.ioError', loader.url);
        var worldEvent = new WorldDataEvent(WorldDataEvent.NO_VENDOR_DATA);
        var country = this.loadedCountries[this.currentView];
        var positions = country.data;
        var key = this.currentView + "/" + this.currentHandSet;
        if (!this.loadedHandsets[key]) {
            var countHourData = new WorldDataSet();
            this.loadedHandsets[key] = countHourData;
            var len = country.numLocations;
            for (var i = 0; i < len; i++) {
                var element = new WorldDataElement();
                element.latitude = positions[i * 2];
                element.longitude = positions[i * 2 + 1];
                var hours = new Array();
                for (var j = 0; j < 24; j++) {
                    hours[j] = 0;
                }
                element.hourlyValues = hours;
                countHourData.elements.push(element);
            }
            countHourData.maxElementValue = 0;
            countHourData.averageElementValue = 0;
        }
        worldEvent.data = this.loadedHandsets[key];
        this.dispatchEvent(worldEvent);
    };
    return WorldData;
})(EventDispatcher);
module.exports = WorldData;


},{"./WorldDataElement":21,"./WorldDataEvent":22,"./WorldDataSet":23,"awayjs-core/lib/events/Event":undefined,"awayjs-core/lib/events/EventDispatcher":undefined,"awayjs-core/lib/events/IOErrorEvent":undefined,"awayjs-core/lib/net/URLLoader":undefined,"awayjs-core/lib/net/URLLoaderDataFormat":undefined,"awayjs-core/lib/net/URLRequest":undefined,"awayjs-core/lib/utils/ByteArray":undefined}],21:[function(require,module,exports){
var WorldDataElement = (function () {
    function WorldDataElement() {
    }
    return WorldDataElement;
})();
module.exports = WorldDataElement;


},{}],22:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Event = require("awayjs-core/lib/events/Event");
var WorldDataEvent = (function (_super) {
    __extends(WorldDataEvent, _super);
    function WorldDataEvent(type) {
        _super.call(this, type);
    }
    WorldDataEvent.prototype.clone = function () {
        return new WorldDataEvent(this.type);
    };
    WorldDataEvent.LOADED = "loadEvent";
    WorldDataEvent.NO_COUNTRY_DATA = "noCountryData";
    WorldDataEvent.NO_VENDOR_DATA = "noVendorData";
    return WorldDataEvent;
})(Event);
module.exports = WorldDataEvent;


},{"awayjs-core/lib/events/Event":undefined}],23:[function(require,module,exports){
var WorldDataSet = (function () {
    function WorldDataSet() {
        this.maxElementValue = 0;
        this.averageElementValue = 0;
        this.elements = new Array();
    }
    return WorldDataSet;
})();
module.exports = WorldDataSet;


},{}]},{},[1])


//# sourceMappingURL=GlobeFacade.js.map