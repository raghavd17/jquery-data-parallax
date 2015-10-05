;(function($) {
    'use strict';

    var $window = $(window),
        $elements = null,
        elementsArr,
        scrollTop,
        windowHeight = $window.height(),
        windowWidth = $window.width(),
        scrollTicking = false,
        resizeTicking = false,
        isTouchDevice = window.Modernizr && typeof(Modernizr.touchevents) != 'undefined' ? Modernizr.touchevents : testTouchEvents();

    function testTouchEvents() {
        return 'ontouchstart' in window // works on most browsers
            || 'onmsgesturechange' in window; // works on ie10
    }

    $.fn.parallax = function(method) {
        switch (method) {
            case 'reset':
                this.css('transform', '');
                break;
            case 'destroy':
                $elements.not(this);
                break;
            default:
                if (!isTouchDevice) {
                    var options = method || {};
                    setParallaxOptions.call(this, options);
                    this.each(updateParallaxData);
                    if ($elements === null) {
                        $elements = this;
                        window.onresize = onResize;
                        window.onscroll = onScroll;
                    }
                    else {
                        $elements.add(this);
                    }
                    elementsArr = $elements.toArray();
                }
        }
        return this;
    };

    function setParallaxOptions(options) {
        options || (options = {});
        this.data("parallax-options", options);
    }

    function updateParallaxData() {
        var $this = $(this),
            options = $this.data("parallax-options"),
            parallax = {};
        if (options.translate || typeof $this.data("parallax-translate") != "undefined" ||
            options.scale || typeof $this.data('parallax-scale') != "undefined" ||
            options.rotate || typeof $this.data('parallax-rotate') != "undefined")
        {
            var translate = $this.data("parallax-translate") || {};
            if (!translate.x && !translate.y && !translate.z) {
                translate = {y: translate};
            }
            options.translate = $.extend(translate, options.translate || {});
            parallax.translateX = getTranslateFunc.call(this, options.translate.x, function() {
                return getMatrixValue.call(this, 12, 4);
            });
            parallax.translateY = getTranslateFunc.call(this, options.translate.y, function() {
                return getMatrixValue.call(this, 13, 5);
            });
            parallax.translateZ = getTranslateFunc.call(this, options.translate.z, function() {
                return getMatrixValue.call(this, 14);
            });
            if (options.scale || typeof $this.data('parallax-scale') != "undefined") {
                parallax.scale = getParallaxFunc.call(this, options.scale || $this.data('parallax-scale'), getScale.call(this));
            }
            if (options.rotate || typeof $this.data('parallax-rotate') != "undefined") {
                parallax.rotate = getParallaxFunc.call(this, options.rotate || $this.data('parallax-rotate'), getRotation.call(this));
            }
        }
        if (options.opacity || typeof $this.data('parallax-opacity') != "undefined") {
            parallax.opacity = getParallaxFunc.call(this, options.opacity || $this.data('parallax-opacity'), parseFloat($this.css('opacity')));
        }
        $this.data("parallax", parallax);
    }

    function onResize() {
        if (!resizeTicking) {
            window.requestAnimationFrame(function() {
                windowHeight = $window.height();
                windowWidth = $window.width();
                $elements.each(updateParallaxData);
            });
            resizeTicking = true;
        }
    }

    function onScroll() {
        if (!scrollTicking) {
            window.requestAnimationFrame(animateElements);
            scrollTicking = true;
        }
    }

    function animateElements() {
        scrollTop = $window.scrollTop();

        for (var i=0; i<elementsArr.length; i++) {
            animateElement.call(elementsArr[i]);
        }

        scrollTicking = false;
    }

    function animateElement() {
        var $this = $(this),
            parallax = $this.data("parallax");
        if (parallax.translateX || parallax.scale || parallax.rotate) {
            var transform = 'translate3d(' + parallax.translateX.call(this) + 'px,' + parallax.translateY.call(this) + 'px,' + parallax.translateZ.call(this) + 'px)';
            if (parallax.scale) {
                transform += ' scale(' + parallax.scale.call(this) + ')';
            }
            if (parallax.rotate) {
                transform += ' rotate(' + parallax.rotate.call(this) + 'deg)'
            }
        }
        console.log(transform);
        this.style['-webkit-transform'] = transform;
        this.style['-moz-transform'] = transform;
        this.style['-ms-transform'] = transform;
        this.style['-o-transform'] = transform;
        this.style.transform = transform;
        if (parallax.opacity) {
            this.style.opacity = parallax.opacity.call(this);
        }
    }

    function getTranslateFunc(options, valueFunc) {
        var currentValue = valueFunc.call(this);
        if (typeof options == "number" || typeof options == "string") {
            if (options === "dynamic") {
                return function () {
                    valueFunc.call(this);
                };
            }
            options = {
                to: options
            };
        }
        if (typeof options == "undefined" || typeof options.to == "undefined") {
            return function() {
                return currentValue;
            };
        }
        var start = options.start || $(this).offset().top,
            trigger = options.trigger || "100%",
            duration = options.duration || "100%",
            from = options.from || currentValue,
            to = options.to;
        return function() {
            var startPx = Math.max(start - convertToPx(trigger), 0),
                durationPx = convertToPx(duration),
                fromPx = convertToPx(from),
                toPx = convertToPx(to);
            if (scrollTop >= startPx && scrollTop <= (startPx + durationPx)) {
                return easeInOutQuad(scrollTop-startPx, fromPx, (toPx - fromPx), durationPx).toFixed(2);
            }
        };
    }

    function getParallaxFunc(options, currentValue) {
        switch (typeof(options)) {
            case "number":
                options = {
                    to: options
                };
                break;
        }
        var start = options.start || $(this).offset().top,
            trigger = options.trigger || "100%",
            duration = options.duration || "100%",
            from = options.from || (currentValue || 0),
            to = options.to;
        return function() {
            var startPx = Math.max(start - convertToPx(trigger), 0),
                durationPx = convertToPx(duration);
            if (scrollTop >= startPx && scrollTop <= (startPx + durationPx)) {
                return easeInOutQuad(scrollTop-startPx, from, (to - from), durationPx);
            }
        };
    }

    function parseMatrix() {
        if (!window.getComputedStyle) return;
        var style = getComputedStyle(this),
            transform = style.transform || style.webkitTransform || style.mozTransform;
        return transform.replace(/^matrix(3d)?\((.*)\)$/,'$2').split(/, /);
    }

    function getMatrixValue(mat3dIdx, matIdx) {
        var matrix = parseMatrix.call(this);
        if (matrix.length && matrix[0] !== 'none') {
            if (matrix.length >= 16) {
                return parseFloat(matrix[mat3dIdx]);
            }
            else if (arguments.length >= 2) {
                return parseFloat(matrix[matIdx]);
            }
        }
        return 0;
    }

    function getScale() {
        var matrix = parseMatrix.call(this),
            scale = 1;
        if (matrix.length && matrix[0] !== 'none') {
            var a = matrix[0],
                b = matrix[1],
                d = 10;
            scale = Math.round( Math.sqrt( a*a + b*b ) * d ) / d;
        }
        return scale;
    }

    function getRotation() {
        var matrix = parseMatrix.call(this),
            angle = 0;
        if (matrix.length && matrix[0] !== 'none') {
            var a = matrix[0],
                b = matrix[1];
            angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
        }
        return angle;
    }

    function convertToPx(value, axis) {
        if(typeof value === "string" && value.match(/%/g)) {
            if(axis === 'x') value = (parseFloat(value) / 100) * windowWidth;
            else value = (parseFloat(value) / 100) * windowHeight;
        }
        return value;
    }

    function easeInOutQuad(t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    }

    if (!isTouchDevice) {
        $(function() {

            $('[data-parallax-translate],[data-parallax-scale],[data-parallax-rotate],[data-parallax-opacity]').parallax();

        });
    }

})(jQuery);
